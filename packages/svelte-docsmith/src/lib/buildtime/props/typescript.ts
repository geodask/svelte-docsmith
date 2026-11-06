/**
 * The type half of props extraction: the TypeScript checker reads a
 * component's props type the way svelte-check does, so a prop typed with an
 * imported alias shows its resolved union rather than the alias name. See
 * docs/adr/0006-own-extractor-on-typescript-checker.md.
 *
 * Each `.svelte` file is served to TypeScript as a virtual `X.svelte.ts`
 * holding its svelte2tsx output. One language service lives per Vite root and
 * is reused across props imports, so unchanged files aren't re-parsed.
 *
 * `typescript` and `svelte2tsx` are optional peer dependencies, loaded only when
 * a page imports `?props`.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type TS from 'typescript';
import type { PropControl } from '../../core/extracted-props.js';

type Ts = typeof TS;
type Svelte2tsx = typeof import('svelte2tsx').svelte2tsx;

export interface TypedProp {
	name: string;
	type: string;
	optional: boolean;
	/** JSDoc description, as markdown. */
	description?: string;
	/** `@deprecated` text (`''` when the tag is bare). */
	deprecated?: string;
	/** `@default` text, which wins over the destructured default. */
	defaultTag?: string;
	/** Tagged `@internal`: left out of the table. */
	internal: boolean;
	/** The props playground control its type allows, if any. */
	control?: PropControl;
}

export interface TypedInheritedAttributes {
	kind: 'element' | 'type';
	label: string;
}

export interface TypedComponent {
	props: TypedProp[];
	inherited: TypedInheritedAttributes[];
	/** Project files the component imports, directly or not, for HMR. */
	files: string[];
}

export interface PropsTypeChecker {
	/**
	 * Read several components against one program: building the program is the
	 * expensive part, so concurrent props imports share it. Each entry is
	 * `undefined` when that component has no typed `$props()`, or the error it
	 * threw.
	 */
	read(files: string[]): (TypedComponent | undefined | Error)[];
}

export const MISSING_PEERS =
	'Generated props tables need TypeScript. Install the optional peer ' +
	'dependencies with: npm i -D typescript svelte2tsx';

/** The optional peer dependencies, plus svelte2tsx's ambient shims. */
export interface Peers {
	ts: Ts;
	svelte2tsx: Svelte2tsx;
	shims: string[];
}

let loaded: Promise<Peers | undefined> | undefined;

/** Load the optional peers once per process; `undefined` when not installed. */
export function loadPeers(): Promise<Peers | undefined> {
	loaded ??= (async () => {
		try {
			const [tsModule, s2t] = await Promise.all([import('typescript'), import('svelte2tsx')]);
			const ts = ((tsModule as { default?: Ts }).default ?? tsModule) as Ts;
			const dir = path.dirname(createRequire(import.meta.url).resolve('svelte2tsx'));
			const shims = ['svelte-shims-v4.d.ts', 'svelte-jsx-v4.d.ts'].map((f) => path.join(dir, f));
			return { ts, svelte2tsx: s2t.svelte2tsx, shims };
		} catch {
			return undefined;
		}
	})();
	return loaded;
}

/** A file's modification time, or `-1` when it can't be read. */
export function mtimeOf(file: string): number {
	try {
		return fs.statSync(file).mtimeMs;
	} catch {
		return -1;
	}
}

/** Whether a path lies inside a `node_modules` directory, on any platform. */
export function inNodeModules(file: string): boolean {
	return /[\\/]node_modules[\\/]/.test(file);
}

const formatFlags = (ts: Ts) =>
	ts.TypeFormatFlags.NoTruncation |
	ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType |
	ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

export function createPropsTypeChecker(
	{ ts, svelte2tsx, shims }: Peers,
	options: { root: string; tsconfig?: string; svelteVersion: string }
): PropsTypeChecker {
	const compilerOptions = readCompilerOptions(ts, options.root, options.tsconfig);
	const roots = new Set<string>();
	const generated = new Map<string, { mtime: number; code: string }>();
	const mtime = mtimeOf;

	// `X.svelte.ts` stands for `X.svelte` unless a real `X.svelte.ts` (a runes
	// module) exists.
	const isVirtual = (file: string) =>
		file.endsWith('.svelte.ts') && !ts.sys.fileExists(file) && ts.sys.fileExists(file.slice(0, -3));
	/** The file on disk a program file stands for. */
	const onDisk = (file: string) => (isVirtual(file) ? file.slice(0, -3) : file);

	const readVirtual = (file: string): string => {
		const svelteFile = file.slice(0, -3);
		const time = mtime(svelteFile);
		const cached = generated.get(svelteFile);
		if (cached && cached.mtime === time) return cached.code;
		const { code } = svelte2tsx(fs.readFileSync(svelteFile, 'utf-8'), {
			filename: svelteFile,
			isTsFile: true,
			mode: 'ts',
			version: options.svelteVersion
		});
		generated.set(svelteFile, { mtime: time, code });
		return code;
	};

	const fileExists = (file: string) => isVirtual(file) || ts.sys.fileExists(file);
	const readFile = (file: string) => (isVirtual(file) ? readVirtual(file) : ts.sys.readFile(file));
	const resolutionHost: TS.ModuleResolutionHost = {
		fileExists,
		readFile,
		directoryExists: ts.sys.directoryExists,
		realpath: ts.sys.realpath,
		getCurrentDirectory: () => options.root,
		getDirectories: ts.sys.getDirectories
	};

	const host: TS.LanguageServiceHost = {
		getCompilationSettings: () => compilerOptions,
		getScriptFileNames: () => [...shims, ...roots],
		getScriptVersion: (file) => String(mtime(onDisk(file))),
		getScriptSnapshot: (file) => {
			const text = readFile(file);
			return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
		},
		getCurrentDirectory: () => options.root,
		getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
		fileExists,
		readFile,
		directoryExists: ts.sys.directoryExists,
		getDirectories: ts.sys.getDirectories,
		realpath: ts.sys.realpath,
		resolveModuleNameLiterals(literals, containingFile, redirected, opts, containingSourceFile) {
			return literals.map((literal) =>
				resolveModule(literal.text, containingFile, opts, redirected, {
					mode: ts.getModeForUsageLocation(containingSourceFile, literal, opts)
				})
			);
		}
	};

	// A `.svelte` specifier resolves like its `.svelte.js` twin, which every
	// resolution mode maps onto the virtual `.svelte.ts`. That keeps relative
	// imports, package `imports` (`#lib/…`) and tsconfig `paths` working.
	function resolveModule(
		name: string,
		containingFile: string,
		opts: TS.CompilerOptions = compilerOptions,
		redirected?: TS.ResolvedProjectReference,
		{ mode }: { mode?: TS.ResolutionMode } = {}
	): TS.ResolvedModuleWithFailedLookupLocations {
		const resolve = (spec: string) =>
			ts.resolveModuleName(spec, containingFile, opts, resolutionHost, undefined, redirected, mode);
		const result = resolve(name);
		if (result.resolvedModule || !name.endsWith('.svelte')) return result;
		return resolve(name + '.js');
	}

	const service = ts.createLanguageService(host, ts.createDocumentRegistry());

	// The project files a component pulls in (its type imports included), so
	// editing a shared `types.ts` re-extracts the props that use it.
	const dependencies = (program: TS.Program, entry: TS.SourceFile): string[] => {
		const seen = new Set<string>([entry.fileName]);
		const queue = [entry.fileName];
		for (let file = queue.shift(); file; file = queue.shift()) {
			const text = program.getSourceFile(file)?.text ?? '';
			for (const { fileName } of ts.preProcessFile(text, true, true).importedFiles) {
				const target = resolveModule(fileName, file).resolvedModule?.resolvedFileName;
				if (!target || inNodeModules(target) || seen.has(target)) continue;
				seen.add(target);
				queue.push(target);
			}
		}
		return [...seen].map(onDisk);
	};

	return {
		read(files) {
			for (const file of files) roots.add(file + '.ts');
			const program = service.getProgram();
			return files.map((file) => {
				try {
					const source = program?.getSourceFile(file + '.ts');
					if (!program || !source) return undefined;
					const typed = readProps(ts, program, source);
					return typed && { ...typed, files: dependencies(program, source) };
				} catch (error) {
					return error instanceof Error ? error : new Error(String(error));
				}
			});
		}
	};
}

function readCompilerOptions(ts: Ts, root: string, tsconfig?: string): TS.CompilerOptions {
	const configFile = tsconfig
		? path.resolve(root, tsconfig)
		: ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
	let base: TS.CompilerOptions = {
		target: ts.ScriptTarget.ESNext,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		strict: true
	};
	if (configFile && ts.sys.fileExists(configFile)) {
		const parsed = ts.getParsedCommandLineOfConfigFile(
			configFile,
			{},
			{
				...ts.sys,
				onUnRecoverableConfigFileDiagnostic: () => {}
			}
		);
		if (parsed) base = parsed.options;
	}
	return {
		...base,
		allowJs: true,
		skipLibCheck: true,
		noEmit: true,
		declaration: false,
		composite: false,
		incremental: false
	};
}

function readProps(ts: Ts, program: TS.Program, source: TS.SourceFile): TypedComponent | undefined {
	const typeNode = findPropsTypeNode(ts, source);
	if (!typeNode) return undefined;

	const checker = program.getTypeChecker();
	const flags = formatFlags(ts);
	const propsType = checker.getTypeFromTypeNode(typeNode);
	const isExternal = (sf: TS.SourceFile) =>
		program.isSourceFileFromExternalLibrary(sf) ||
		program.isSourceFileDefaultLibrary(sf) ||
		inNodeModules(sf.fileName);
	const declaredOutside = (symbol: TS.Symbol) => {
		const declarations = symbol.getDeclarations() ?? [];
		return declarations.length > 0 && declarations.every((d) => isExternal(d.getSourceFile()));
	};

	// A prop typed with an alias from a library (`ClassValue`) keeps its name:
	// expanding it would print the library's internals. Project aliases fall
	// through to `printPropType`, which expands them.
	const libraryAlias = (symbol: TS.Symbol): string | undefined => {
		const declaration = symbol.valueDeclaration;
		if (!declaration || !ts.isPropertySignature(declaration) || !declaration.type) return;
		const declared = checker.getTypeFromTypeNode(declaration.type);
		const alias = declared.aliasSymbol?.getDeclarations() ?? [];
		if (alias.length === 0 || !alias.every((d) => isExternal(d.getSourceFile()))) return;
		return checker.typeToString(declared, typeNode, flags);
	};

	const props: TypedProp[] = [];
	let anyInherited = false;
	for (const symbol of checker.getPropertiesOfType(propsType)) {
		if (declaredOutside(symbol)) {
			anyInherited = true;
			continue;
		}
		const optional = (symbol.flags & ts.SymbolFlags.Optional) !== 0;
		const tags = symbol.getJsDocTags(checker);
		const tag = (name: string) => {
			const found = tags.find((t) => t.name === name);
			return found ? ts.displayPartsToString(found.text ?? []).trim() : undefined;
		};
		const description = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
		const type = checker.getTypeOfSymbol(symbol);
		props.push({
			name: symbol.name,
			type: libraryAlias(symbol) ?? printPropType(ts, checker, type, optional, typeNode, flags),
			optional,
			description: description || undefined,
			deprecated: tag('deprecated'),
			defaultTag: tag('default'),
			internal: tag('internal') !== undefined,
			control: controlFor(ts, type)
		});
	}

	const inherited = anyInherited
		? inheritedGroups(ts, program, checker, propsType, declaredOutside, typeNode, flags)
		: [];

	return { props, inherited, files: [] };
}

/**
 * The playground control a prop's type allows: `boolean`, `string` and
 * `number` get their own, and a union of string or number literals (enum
 * members included) a choice between them. `undefined` and `null` in a union
 * only make the prop unsettable, which the playground offers anyway. Every
 * other type (snippets, callbacks, objects, type parameters, mixed unions)
 * gets none.
 */
export function controlFor(ts: Ts, type: TS.Type): PropControl | undefined {
	const members = (type.isUnion() ? type.types : [type]).filter(
		(t) => !(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))
	);
	if (members.length === 0) return undefined;
	const every = (flag: TS.TypeFlags) => members.every((t) => t.flags & flag);
	if (every(ts.TypeFlags.BooleanLike)) return { kind: 'boolean' };
	if (members.length === 1 && members[0].flags & ts.TypeFlags.String) return { kind: 'text' };
	if (members.length === 1 && members[0].flags & ts.TypeFlags.Number) return { kind: 'number' };
	if (every(ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral)) {
		return {
			kind: 'options',
			options: members.map((t) => (t as TS.LiteralType).value as string | number)
		};
	}
	return undefined;
}

/** The type annotation on the `$props()` declaration in the svelte2tsx output. */
function findPropsTypeNode(ts: Ts, source: TS.SourceFile): TS.TypeNode | undefined {
	let found: TS.TypeNode | undefined;
	const visit = (node: TS.Node): void => {
		if (found) return;
		if (
			ts.isVariableDeclaration(node) &&
			node.initializer &&
			ts.isCallExpression(node.initializer) &&
			ts.isIdentifier(node.initializer.expression) &&
			node.initializer.expression.text === '$props'
		) {
			found = node.type;
			return;
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return found;
}

/** `Snippet<[]>` is how the checker spells a bare `Snippet`. */
const bareSnippet = (type: string) => type.replace(/\bSnippet<\[\]>/g, 'Snippet');

/**
 * A union prints member by member: an alias of literals (`BadgeVariant`)
 * expands to its values, and the `undefined` an optional prop picks up is
 * dropped. Any other type prints as written (`Snippet`, `Item[]`, `T`).
 */
function printPropType(
	ts: Ts,
	checker: TS.TypeChecker,
	type: TS.Type,
	optional: boolean,
	enclosing: TS.Node,
	flags: TS.TypeFormatFlags
): string {
	if (!type.isUnion()) return bareSnippet(checker.typeToString(type, enclosing, flags));
	let members = type.types.filter((t) => !(optional && t.flags & ts.TypeFlags.Undefined));
	const booleans = members.filter((t) => t.flags & ts.TypeFlags.BooleanLiteral);
	const parts: string[] = [];
	let wroteBoolean = false;
	if (booleans.length === 2) {
		members = members.filter((t) => !booleans.includes(t));
		wroteBoolean = true;
	}
	for (const member of members)
		parts.push(bareSnippet(checker.typeToString(member, enclosing, flags)));
	if (wroteBoolean) parts.push('boolean');
	if (parts.length === 1) return parts[0];
	return parts.map((p) => (p.includes('=>') ? `(${p})` : p)).join(' | ');
}

/**
 * Name what the external props came from: each part of the props intersection
 * (or base of the props interface) whose props are all declared outside the
 * project. An element's attributes (`HTMLAnchorAttributes`) are named by tag.
 */
function inheritedGroups(
	ts: Ts,
	program: TS.Program,
	checker: TS.TypeChecker,
	propsType: TS.Type,
	declaredOutside: (s: TS.Symbol) => boolean,
	enclosing: TS.Node,
	flags: TS.TypeFormatFlags
): TypedInheritedAttributes[] {
	const parts: TS.Type[] = [];
	const collect = (type: TS.Type) => {
		if (type.isIntersection()) {
			type.types.forEach(collect);
			return;
		}
		const props = checker.getPropertiesOfType(type);
		if (props.length > 0 && props.every(declaredOutside)) {
			parts.push(type);
			return;
		}
		const target = (type as TS.TypeReference).target ?? type;
		if (target.isClassOrInterface()) {
			for (const base of checker.getBaseTypes(target as TS.InterfaceType)) collect(base);
		}
	};
	collect(propsType);

	const tags = elementTags(program, checker);
	const groups = parts.map((type): TypedInheritedAttributes => {
		const tag = tags.get(type);
		return tag
			? { kind: 'element', label: tag }
			: { kind: 'type', label: checker.typeToString(type, enclosing, flags) };
	});
	return groups.length > 0 ? groups : [{ kind: 'type', label: 'more inherited attributes' }];
}

/**
 * Attribute types that belong to exactly one tag in Svelte's
 * `SvelteHTMLElements` map (`HTMLAnchorAttributes` → `a`). Shared types like
 * `HTMLAttributes<HTMLElement>` map to many tags, so they keep their name.
 */
function elementTags(program: TS.Program, checker: TS.TypeChecker): Map<TS.Type, string> {
	const tags = new Map<TS.Type, string>();
	const elements = program
		.getSourceFiles()
		.find((sf) => /[\\/]svelte[\\/]elements\.d\.ts$/.test(sf.fileName));
	const moduleSymbol = elements && checker.getSymbolAtLocation(elements);
	const map =
		moduleSymbol &&
		checker.getExportsOfModule(moduleSymbol).find((s) => s.name === 'SvelteHTMLElements');
	if (!map) return tags;
	const shared = new Set<TS.Type>();
	for (const entry of checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(map))) {
		const type = checker.getTypeOfSymbol(entry);
		if (tags.has(type)) shared.add(type);
		else tags.set(type, entry.name);
	}
	for (const type of shared) tags.delete(type);
	return tags;
}
