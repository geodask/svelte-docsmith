/**
 * Props extraction for props imports (`Component.svelte?props`): merges what
 * the source says (./parse.ts: destructured names, defaults, `$bindable()`)
 * with what TypeScript says (./typescript.ts: types, optionality, JSDoc) into
 * the `ExtractedProps` that `<PropsTable of={…}>` renders.
 *
 * Extraction never throws over one component. Anything it can't read becomes a
 * warning naming the file, and the table shows what was found: untyped props
 * by name only, a missing TypeScript install as names and defaults.
 */
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { VERSION } from 'svelte/compiler';
import type {
	ExtractedProp,
	ExtractedProps,
	PropControl,
	PropValue
} from '../../core/extracted-props.js';
import { parseComponent } from './parse.js';
import {
	createPropsTypeChecker,
	inNodeModules,
	loadPeers,
	mtimeOf,
	MISSING_PEERS,
	type PropsTypeChecker,
	type TypedComponent
} from './typescript.js';

export interface ExtractResult {
	/** What `<PropsTable of={…}>` renders: descriptions as inline HTML. */
	props: ExtractedProps;
	/**
	 * The same props with descriptions and deprecation notes as the JSDoc's own
	 * markdown, for agent markdown.
	 */
	markdown: ExtractedProps;
	warnings: string[];
	/** Files whose changes should re-extract this component. */
	watchFiles: string[];
}

export interface PropsExtractorOptions {
	/** Project root: where `tsconfig.json` is looked up. */
	root: string;
	/** tsconfig used to read prop types. Default: the root's `tsconfig.json`. */
	tsconfig?: string;
}

export interface PropsExtractor {
	extract(file: string): Promise<ExtractResult>;
}

type TypedResult = TypedComponent | undefined | Error | 'missing-peers';

export function createPropsExtractor(options: PropsExtractorOptions): PropsExtractor {
	let checker: Promise<PropsTypeChecker | undefined> | undefined;
	const getChecker = () =>
		(checker ??= loadPeers().then(
			(peers) =>
				peers &&
				createPropsTypeChecker(peers, {
					...options,
					svelteVersion: VERSION
				})
		));

	// Props imports load concurrently (a page with five tables asks for five at
	// once). Collect the requests made in the same tick and read them against
	// one TypeScript program instead of rebuilding it per component.
	let batch: { file: string; done: (result: TypedResult) => void }[] = [];
	const flush = async () => {
		const items = batch;
		batch = [];
		let results: TypedResult[];
		try {
			const tsChecker = await getChecker();
			results = tsChecker
				? tsChecker.read(items.map((item) => item.file))
				: items.map(() => 'missing-peers');
		} catch (error) {
			// Setting TypeScript up failed (a broken tsconfig, say). Report it on
			// every waiting import rather than leaving them pending, and try again
			// from scratch next time.
			checker = undefined;
			const failure = error instanceof Error ? error : new Error(String(error));
			results = items.map(() => failure);
		}
		items.forEach((item, i) => item.done(results[i]));
	};
	const readTyped = (file: string) =>
		new Promise<TypedResult>((done) => {
			if (batch.push({ file, done }) === 1) setTimeout(flush, 0);
		});

	// Results stay valid until one of the files they were read from changes.
	// The client and server builds both import every props module, so the
	// second build is served from here.
	const cache = new Map<string, { stamps: [string, number][]; result: ExtractResult }>();
	const stamp = mtimeOf;

	return {
		async extract(file) {
			const cached = cache.get(file);
			if (cached && cached.stamps.every(([f, time]) => stamp(f) === time)) return cached.result;
			const result = await extractFresh(file);
			cache.set(file, { stamps: result.watchFiles.map((f) => [f, stamp(f)]), result });
			return result;
		}
	};

	async function extractFresh(file: string): Promise<ExtractResult> {
		const warnings: string[] = [];
		const rel = path.relative(options.root, file) || file;
		const warn = (message: string) => warnings.push(`${rel}: ${message}`);
		const extracted: ExtractedProps = {
			name: componentName(file),
			typeParameters: [],
			props: [],
			inherited: []
		};

		if (inNodeModules(file)) {
			warn(
				'reading a published package file. Published components usually have their ' +
					'types stripped, so point the props import at the source instead.'
			);
		}

		// Rows are built once, with JSDoc as markdown; the rendered table's copy
		// differs only in turning that markdown into HTML.
		const done = (watchFiles: string[]): ExtractResult => ({
			props: {
				...extracted,
				props: extracted.props.map((prop) =>
					clean({
						...prop,
						deprecated: prop.deprecated === undefined ? undefined : renderMarkdown(prop.deprecated),
						description: prop.description ? renderMarkdown(prop.description) : undefined
					})
				)
			},
			markdown: extracted,
			warnings,
			watchFiles
		});

		let parsed;
		try {
			parsed = parseComponent(fs.readFileSync(file, 'utf-8'), file);
		} catch (error) {
			warn(`could not parse the component (${message(error)}).`);
			return done([file]);
		}
		extracted.typeParameters = parsed.typeParameters;
		if (!parsed.hasProps) {
			warn('no `$props()` found, so the props table is empty.');
			return done([file]);
		}

		let typed: TypedComponent | undefined;
		if (parsed.typed) {
			const result = await readTyped(file);
			if (result === 'missing-peers') warn(MISSING_PEERS);
			else if (result instanceof Error) {
				warn(`could not read prop types (${result.message}). Showing names only.`);
			} else typed = result;
		} else {
			warn('`$props()` has no type annotation, so props show without types.');
		}

		const defaults = new Map(parsed.destructured.map((d) => [d.name, d]));
		if (typed) {
			for (const prop of typed.props) {
				if (prop.internal) continue;
				const destructured = defaults.get(prop.name);
				const fallback = prop.defaultTag ?? destructured?.default;
				// A deprecated prop stays out of the playground: it documents what
				// not to use.
				const control = prop.deprecated === undefined ? prop.control : undefined;
				extracted.props.push(
					clean({
						name: prop.name,
						type: prop.type,
						default: fallback,
						required: !prop.optional && fallback === undefined,
						bindable: destructured?.bindable ?? false,
						deprecated: prop.deprecated,
						description: prop.description,
						control,
						initial: control && fitsControl(control, destructured?.literal)
					})
				);
			}
			extracted.inherited = typed.inherited;
		} else {
			for (const d of parsed.destructured) {
				extracted.props.push(
					clean({ name: d.name, default: d.default, required: false, bindable: d.bindable })
				);
			}
		}

		return done([...new Set([file, ...(typed?.files ?? [])])]);
	}
}

/** `file-tree-item.svelte` → `FileTreeItem`. */
export function componentName(file: string): string {
	return path
		.basename(file, '.svelte')
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join('');
}

/** A literal default as the control's starting value, when the control can hold it. */
function fitsControl(control: PropControl, value: PropValue | undefined): PropValue | undefined {
	if (value === undefined) return undefined;
	switch (control.kind) {
		case 'boolean':
			return typeof value === 'boolean' ? value : undefined;
		case 'text':
			return typeof value === 'string' ? value : undefined;
		case 'number':
			return typeof value === 'number' ? value : undefined;
		case 'options':
			return typeof value !== 'boolean' && control.options.includes(value) ? value : undefined;
	}
}

function renderMarkdown(text: string): string {
	return (marked.parse(text, { async: false, gfm: true }) as string)
		.trim()
		.replace(/^<p>([\s\S]*)<\/p>$/, (match, inner: string) =>
			inner.includes('<p>') ? match : inner
		);
}

function clean(prop: ExtractedProp): ExtractedProp {
	return Object.fromEntries(
		Object.entries(prop).filter(([, value]) => value !== undefined)
	) as unknown as ExtractedProp;
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
