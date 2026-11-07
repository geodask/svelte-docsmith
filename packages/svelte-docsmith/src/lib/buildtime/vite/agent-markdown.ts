/**
 * Agent markdown: a page's markdown as an agent reads it (llms-full.txt, the
 * `.md` twins, the MCP server), and the llms index that carries it. The page as
 * written keeps `<LiveExample source={…}>` and `<PropsTable of={…}>` as bare
 * tags and their imports are stripped with the `<script>` block, so an agent
 * would never see the example code or the component's props. Here each tag
 * whose attribute binds a doc import is written out by that import's kind (see
 * `./doc-imports/`): a `LiveExample`'s `?source` as a fenced `svelte` block, a
 * `PropsTable`'s props import as a heading and a markdown table of the same
 * rows the page renders. This module only finds the tags and the imports; what
 * each becomes is the kind's.
 *
 * {@link llmsIndex} is the whole of it: pages and a host in, finished index
 * entries out. Resolving imports and reading files is the host's job, so the
 * plugin hands it Vite's resolver, the file reads and the props extractor, and
 * a test hands it literals.
 */
import type { LlmsDoc } from '../../core/content.js';
import { outsideCodeFenceRuns, scriptBlocks } from '../markdown-source.js';
import { relativeToCwd } from '../paths.js';
import { indexedPages, type IndexedPage, type IndexOptions } from './collect.js';
import { extractLlmsContent } from './extract.js';
import { readField } from './fields.js';
import type { SourcePage } from './pages.js';
import {
	DOC_IMPORT_KINDS,
	type DocImportKind,
	type DocImportReads,
	type DocImportValues
} from './doc-imports/index.js';

/** One doc import in a page's `<script>`. */
type DocImport = {
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

/**
 * What building agent markdown needs from its caller: Vite's resolver, watcher
 * and warnings, and each doc import kind's read (by query: `source`, `props`),
 * in the plugin; literals in a test. A read returns `undefined` when the file
 * can't be read, and watches whatever it read beyond the file itself.
 */
export type AgentMarkdownHost = DocImportReads & {
	resolve: ResolveImport;
	/** Record a file the agent markdown was read from, so editing it rebuilds the index. */
	watch(file: string): void;
	warn(message: string): void;
};

/**
 * The llms index: every titled page's title, section, order, description and
 * agent markdown, sorted by path. Served as the `svelte-docsmith/llms` virtual
 * module and read server-side by the `llms.txt`, `llms-full.txt`, `.md` and MCP
 * route handlers, so it never ships to the client.
 *
 * Only the pages the index keeps are read, so a stub page can't warn or load
 * TypeScript. Every page is read at once, so the props extractor batches all
 * their components into one TypeScript update.
 */
export async function llmsIndex(
	pages: SourcePage[],
	options: IndexOptions,
	host: AgentMarkdownHost
): Promise<LlmsDoc[]> {
	const indexed = indexedPages(pages, options);
	const reads = await Promise.all(indexed.map((page) => readDocImports(page, host)));
	return indexed.map((page, i) => ({
		path: page.url,
		title: page.title,
		section: readField(page.frontmatter, 'section'),
		order: readField(page.frontmatter, 'order'),
		description: readField(page.frontmatter, 'description'),
		content: agentMarkdown(page, reads[i], host.warn),
		version: page.version
	}));
}

const KIND_BY_QUERY = new Map(DOC_IMPORT_KINDS.map((kind) => [kind.query, kind]));
const KIND_BY_TAG = new Map(DOC_IMPORT_KINDS.map((kind) => [kind.tag, kind]));

/** A default import of a `.svelte` file through one of the kinds' queries. */
const DOC_IMPORT = new RegExp(
	String.raw`\bimport\s+([A-Za-z_$][\w$]*)\s+from\s*(['"])([^'"\n]+?\.svelte)\?(${[
		...KIND_BY_QUERY.keys()
	].join('|')})\2`,
	'g'
);

/**
 * A page's doc imports, keyed by the local name each binds, with every
 * specifier resolved from the page. Imports inside fenced code samples are not
 * the page's, and are skipped.
 */
async function docImports(
	page: Pick<SourcePage, 'file' | 'source'>,
	resolve: ResolveImport
): Promise<Map<string, DocImport>> {
	const matches = scriptBlocks(page.source).flatMap((block) => [...block.matchAll(DOC_IMPORT)]);
	const resolved = await Promise.all(
		matches.map(async ([, local, , base, query]): Promise<[string, DocImport]> => [
			local,
			{
				kind: KIND_BY_QUERY.get(query as keyof DocImportValues)!,
				specifier: `${base}?${query}`,
				file: await resolve(base, page.file)
			}
		])
	);
	return new Map(resolved);
}

/** One doc import and what it read to: `undefined` where it could not be read. */
type DocImportRead = DocImport & { value: unknown };

/**
 * Resolve and read a page's doc imports, keyed by local name, watching each
 * file they resolve to. `undefined` when the page imports nothing agent
 * markdown expands, so most pages cost one scan of their script.
 */
async function readDocImports(
	page: SourcePage,
	host: AgentMarkdownHost
): Promise<Map<string, DocImportRead> | undefined> {
	const imports = await docImports(page, host.resolve);
	if (imports.size === 0) return undefined;
	// All reads start together, so the props extractor batches them.
	const reads = await Promise.all(
		[...imports].map(async ([local, entry]): Promise<[string, DocImportRead]> => {
			// Watched even when it can't be read, so creating or fixing it rebuilds.
			if (entry.file !== undefined) host.watch(entry.file);
			const value = entry.file === undefined ? undefined : await host[entry.kind.query](entry.file);
			return [local, { ...entry, value }];
		})
	);
	return new Map(reads);
}

/**
 * A tag of one of the kinds starting a line: `<Tag …/>` or `<Tag …>…</Tag>`.
 * Group 1 is its indentation, group 2 its name, group 3 its attributes; an
 * attribute value in braces may contain `>`.
 */
const DOC_TAG = new RegExp(
	String.raw`^([ \t]*)<(${[...KIND_BY_TAG.keys()].join('|')})\b((?:[^>{}]|\{[^{}]*\})*?)(?:\/>|>[\s\S]*?<\/\2\s*>)`,
	'gm'
);

/** The local name `attribute={name}`, or the `{attribute}` shorthand, binds in `attributes`. */
function boundName(attributes: string, attribute: string): string | undefined {
	const match = new RegExp(
		String.raw`(?:(?:^|\s)${attribute}\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}|\{\s*(${attribute})\s*\})`
	).exec(attributes);
	return match?.[1] ?? match?.[2];
}

/**
 * A page's agent markdown: the page as written with its frontmatter and setup
 * blocks dropped and its title as an `h1`, then each tag whose import was read
 * written out by its kind. The imports come from the raw source, as the setup
 * blocks that hold them are gone from the text being rewritten.
 */
function agentMarkdown(
	page: IndexedPage,
	reads: Map<string, DocImportRead> | undefined,
	warn: (message: string) => void
): string {
	const content = extractLlmsContent(page.source, page.title);
	if (reads === undefined) return content;

	// The level of the heading a tag sits under, carried across code fences.
	let level = 1;
	return outsideCodeFenceRuns(content, (prose) => {
		const levelAt = (offset: number) => lastHeadingLevel(prose.slice(0, offset)) ?? level;
		const written = prose.replace(
			DOC_TAG,
			(tag, indent: string, name: string, attributes: string, offset: number) => {
				const kind = KIND_BY_TAG.get(name)!;
				const local = boundName(attributes, kind.attribute);
				const read = local === undefined ? undefined : reads.get(local);
				// Not bound to an import of this kind: not ours to write out.
				if (read === undefined || read.kind !== kind) return tag;
				if (read.value === undefined) {
					warn(
						`${relativeToCwd(page.file)}: could not read \`${read.specifier}\` ` +
							`for <${name} ${kind.attribute}={${local}}>, so agent markdown keeps the tag.`
					);
					return tag;
				}
				return kind.write(read.value as never, { attributes, indent, level: levelAt(offset) });
			}
		);
		level = levelAt(prose.length);
		return written;
	});
}

/** An ATX heading's marker. */
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]|$)/gm;

/** The level of the last heading in `prose`, if it has one. */
function lastHeadingLevel(prose: string): number | undefined {
	return [...prose.matchAll(HEADING)].at(-1)?.[1].length;
}
