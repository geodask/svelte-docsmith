/**
 * Agent markdown: a page's markdown as an agent reads it (llms-full.txt, the
 * `.md` twins, the MCP server). The page as written keeps `<LiveExample
 * source={…}>` as a bare tag and its imports are stripped with the `<script>`
 * block, so an agent would never see the example code. Here each such tag whose
 * source is a `?source` import becomes a fenced `svelte` block of the example
 * file's raw source.
 *
 * Unlike `./collect.js` this reads the filesystem and resolves imports, so it
 * runs in the plugin, which hands it Vite's resolver.
 */
import fs from 'node:fs';
import { outsideCodeFenceRuns, scriptBlocks } from '../markdown-source.js';
import { relativeToCwd } from '../paths.js';
import type { SourcePage } from './pages.js';

/** Which build-time transform a page import goes through. */
export type DocImportKind = 'source' | 'props';

/** One `*.svelte?source` or `*.svelte?props` import in a page's `<script>`. */
export type DocImport = {
	kind: DocImportKind;
	/** The specifier as written, query included, for messages. */
	specifier: string;
	/** The component file it resolves to, or `undefined` when it did not resolve. */
	file: string | undefined;
};

/**
 * Resolve a specifier (query stripped) from a page, the way Vite resolves the
 * page's own imports: the app's aliases (`$lib`, `#lib`) included. Returns the
 * resolved file, or `undefined` when nothing resolves it.
 */
export type ResolveImport = (specifier: string, importer: string) => Promise<string | undefined>;

/** What building agent markdown needs from the plugin. */
export type AgentMarkdownHost = {
	resolve: ResolveImport;
	/** Record a file the agent markdown was read from, so editing it rebuilds the index. */
	watch(file: string): void;
	warn(message: string): void;
};

/** A default import of a `.svelte` file through `?source` or `?props`. */
const DOC_IMPORT =
	/\bimport\s+([A-Za-z_$][\w$]*)\s+from\s*(['"])([^'"\n]+?\.svelte)\?(source|props)\2/g;

/**
 * A page's `?source` and `?props` imports, keyed by the local name each binds,
 * with every specifier resolved from the page. Imports inside fenced code
 * samples are not the page's, and are skipped.
 */
export async function docImports(
	page: Pick<SourcePage, 'file' | 'source'>,
	resolve: ResolveImport
): Promise<Map<string, DocImport>> {
	const imports = new Map<string, DocImport>();
	for (const block of scriptBlocks(page.source)) {
		for (const [, local, , base, kind] of block.matchAll(DOC_IMPORT)) {
			const file = await resolve(base, page.file);
			imports.set(local, { kind: kind as DocImportKind, specifier: `${base}?${kind}`, file });
		}
	}
	return imports;
}

/**
 * A `<LiveExample …>…</LiveExample>` (or self-closing) tag starting a line.
 * Group 1 is its indentation, group 2 its attributes; an attribute value in
 * braces may contain `>`.
 */
const LIVE_EXAMPLE =
	/^([ \t]*)<LiveExample\b((?:[^>{}]|\{[^{}]*\})*?)(?:\/>|>[\s\S]*?<\/LiveExample\s*>)/gm;

/** `source={name}`, or the `{source}` shorthand. */
const SOURCE_ATTRIBUTE = /(?:\bsource\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}|\{\s*(source)\s*\})/;

/** A fenced block of `code`, fenced longer than any backtick run inside it. */
function fenced(code: string, lang: string, indent: string): string {
	const longest = Math.max(0, ...[...code.matchAll(/`+/g)].map(([run]) => run.length));
	const fence = '`'.repeat(Math.max(3, longest + 1));
	return [fence + lang, ...code.split('\n'), fence]
		.map((line) => (line ? indent + line : line))
		.join('\n');
}

/**
 * Build the agent markdown rewrite for one page: a function from the page's
 * llms content to its agent markdown. `undefined` when the page imports nothing
 * agent markdown expands, so most pages cost one scan of their script.
 */
export async function agentMarkdownFor(
	page: SourcePage,
	host: AgentMarkdownHost
): Promise<((content: string) => string) | undefined> {
	const imports = await docImports(page, host.resolve);
	if (imports.size === 0) return undefined;

	// Read up front, so the rewrite itself is synchronous.
	const sources = new Map<string, string | undefined>();
	for (const [local, entry] of imports) {
		if (entry.kind !== 'source') continue;
		sources.set(local, entry.file === undefined ? undefined : readExample(entry.file, host));
	}

	return (content) =>
		outsideCodeFenceRuns(content, (prose) =>
			prose.replace(LIVE_EXAMPLE, (tag, indent: string, attributes: string) => {
				const match = SOURCE_ATTRIBUTE.exec(attributes);
				const local = match?.[1] ?? match?.[2];
				if (local === undefined || !sources.has(local)) return tag;
				const code = sources.get(local);
				if (code === undefined) {
					host.warn(
						`${relativeToCwd(page.file)}: could not read \`${imports.get(local)?.specifier}\` ` +
							`for <LiveExample source={${local}}>, so agent markdown keeps the tag.`
					);
					return tag;
				}
				return fenced(code, 'svelte', indent);
			})
		);
}

/** An example file's raw source, as the `?source` transform reads it, and watch it. */
function readExample(file: string, host: AgentMarkdownHost): string | undefined {
	try {
		const code = fs.readFileSync(file, 'utf-8').trimEnd();
		host.watch(file);
		return code;
	} catch {
		return undefined;
	}
}
