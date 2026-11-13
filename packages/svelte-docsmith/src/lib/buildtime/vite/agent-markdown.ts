/**
 * Agent markdown: a page's markdown as an agent reads it (llms-full.txt, the
 * `.md` twins, the MCP server), and the llms index that carries it.
 *
 * The page as written keeps docs component tags as bare tags, and their
 * imports are stripped with the `<script>` block, so an agent would never see
 * an example's code, a component's props or a section's pages. So the page is
 * walked once, and everything that is written out for an agent is one entry in
 * one of two places:
 *
 *  - a **tag rewrite** in {@link TAG_REWRITES} replaces a docs component's tag:
 *    a `LiveExample`'s `?source` as a fenced `svelte` block, a `PropsTable`'s
 *    props import as a heading and a markdown table of the rows the page
 *    renders, `<SectionCards />` as a list of links. A new docs component that
 *    an agent should read is one more entry.
 *  - a fenced block is offered to the install block writer, the one rewrite of
 *    code there is.
 *
 * What a rewrite writes is never looked at again, so no rewrite can see
 * another's output and there is no order between them to keep.
 *
 * {@link llmsIndex} is the whole of it: pages and a host in, finished index
 * entries out. Resolving imports and reading files is the host's job, so the
 * plugin hands it Vite's resolver, the file reads and the props extractor, and
 * a test hands it literals.
 */
import type { LlmsDoc } from '../../core/content.js';
import { scriptBlocks, stretches } from '../markdown-source.js';
import { relativeToCwd } from '../paths.js';
import { indexedPages, type IndexedPage, type IndexOptions } from './collect.js';
import { extractLlmsContent } from './extract.js';
import { writeInstallBlock } from '../install-block.js';
import { readField } from './fields.js';
import { sectionCardsRewrite } from './section-cards.js';
import type { SectionPage } from '../../core/section-cards.js';
import type { SourcePage } from './pages.js';
import {
	DOC_IMPORT_KINDS,
	type DocImportKind,
	type DocImportReads,
	type DocImportValues,
	type TagSite
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
	const placed = indexed.map((page) => ({
		path: page.url,
		title: page.title,
		section: readField(page.frontmatter, 'section'),
		order: readField(page.frontmatter, 'order'),
		description: readField(page.frontmatter, 'description')
	}));
	// `<SectionCards />` lists pages of the page's own version only.
	const byVersion = new Map<string | undefined, SectionPage[]>();
	indexed.forEach((page, i) => {
		const pages = byVersion.get(page.version) ?? [];
		byVersion.set(page.version, [...pages, placed[i]]);
	});
	return indexed.map((page, i) => {
		const content = agentMarkdown(page, {
			file: page.file,
			path: page.url,
			section: placed[i].section,
			pages: byVersion.get(page.version)!,
			imports: reads[i],
			warn: host.warn
		});
		return { ...placed[i], content, version: page.version };
	});
}

const KIND_BY_QUERY = new Map(DOC_IMPORT_KINDS.map((kind) => [kind.query, kind]));

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

/** A docs component tag found in a page's prose. */
export type AgentTag = TagSite & {
	/** The tag as written, from its indentation to the end of its close tag. */
	raw: string;
	/** What sits between its open and close tags; `undefined` for `<Tag />`. */
	body: string | undefined;
};

/** What a rewrite knows about the page it is writing for. */
export type AgentPage = {
	/** Absolute path of the page file, for messages. */
	file: string;
	/** The page's URL. */
	path: string;
	section: SectionPage['section'];
	/** Every indexed page of the page's own version, this one included. */
	pages: SectionPage[];
	/** The page's doc imports, read, by the local name each binds. */
	imports: Map<string, DocImportRead> | undefined;
	warn(message: string): void;
};

/** How one docs component's tag is written out for an agent. */
export type TagRewrite = {
	/** The component's name, as the tag is written. */
	tag: string;
	/**
	 * The markdown that replaces one tag, or `undefined` to keep the tag as
	 * written. A tag kept is still looked inside for other tags.
	 */
	write(tag: AgentTag, page: AgentPage): string | undefined;
};

/**
 * A doc import kind as a tag rewrite: the tag's `attribute={name}`, or the
 * `{attribute}` shorthand, binds one of the page's doc imports, and the kind
 * writes out what that import read. A tag that binds none is not this kind's,
 * and one whose import could not be read is kept, with a warning.
 */
function docImportRewrite(kind: DocImportKind): TagRewrite {
	const binding = new RegExp(
		String.raw`(?:(?:^|\s)${kind.attribute}\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}|\{\s*(${kind.attribute})\s*\})`
	);
	return {
		tag: kind.tag,
		write(tag, page) {
			const match = binding.exec(tag.attributes);
			const local = match?.[1] ?? match?.[2];
			const read = local === undefined ? undefined : page.imports?.get(local);
			if (read?.kind !== kind) return undefined;
			if (read.value === undefined) {
				page.warn(
					`${relativeToCwd(page.file)}: could not read \`${read.specifier}\` ` +
						`for <${kind.tag} ${kind.attribute}={${local}}>, so agent markdown keeps the tag.`
				);
				return undefined;
			}
			return kind.write(read.value as never, tag);
		}
	};
}

/**
 * Every docs component whose tag is written out for an agent. Each rewrite
 * answers for one tag name, so their order here says nothing.
 */
const TAG_REWRITES: readonly TagRewrite[] = [
	...DOC_IMPORT_KINDS.map(docImportRewrite),
	sectionCardsRewrite
];

const REWRITE_BY_TAG = new Map(TAG_REWRITES.map((rewrite) => [rewrite.tag, rewrite]));

/**
 * A tag with a rewrite, starting a line: `<Tag …/>` or `<Tag …>…</Tag>`.
 * Group 1 is its indentation, group 2 its name, group 3 its attributes (an
 * attribute value in braces may contain `>`) and group 4 what is between its
 * open and close tags.
 */
const REWRITTEN_TAG = new RegExp(
	String.raw`^([ \t]*)<(${[...REWRITE_BY_TAG.keys()].join('|')})\b((?:[^>{}]|\{[^{}]*\})*?)(?:\/>|>([\s\S]*?)<\/\2\s*>)`,
	'gm'
);

/**
 * A page's agent markdown: the page as written with its frontmatter and setup
 * blocks dropped and its title as an `h1`, then walked once, fence by fence
 * and prose run by prose run. An install block is written out for every
 * package manager, and each tag in prose is written out by its rewrite. Tags
 * in fenced code are sample code, and stay.
 *
 * The page's imports come from its raw source, as the setup blocks that hold
 * them are gone from the text being walked.
 */
function agentMarkdown(page: IndexedPage, site: AgentPage): string {
	const content = extractLlmsContent(page.source, page.title, readField(page.frontmatter, 'since'));
	// Pages aren't normalised, so a Windows checkout's CRLF lines are read
	// without their \r and written back with it.
	const crlf = content.includes('\r\n');
	const out: string[] = [];
	// The level of the heading a tag sits under, carried across code fences.
	let level = 1;

	for (const stretch of stretches(content.split(/\r?\n/))) {
		if (stretch.kind === 'fence') {
			out.push(...(writeInstallBlock(stretch) ?? stretch.lines));
			continue;
		}
		const prose = stretch.lines.join('\n');
		out.push(rewriteTags(prose, site, level));
		level = lastHeadingLevel(prose) ?? level;
	}

	const written = out.join('\n');
	return crlf ? written.replace(/\r?\n/g, '\r\n') : written;
}

/**
 * One run of prose with each tag written out by its rewrite. `level` is the
 * heading level the run starts under.
 */
function rewriteTags(prose: string, page: AgentPage, level: number): string {
	const levelAt = (offset: number) => lastHeadingLevel(prose.slice(0, offset)) ?? level;
	// `base` is where `text` starts in `prose`, for the heading level.
	const rewrite = (text: string, base: number): string =>
		text.replace(
			REWRITTEN_TAG,
			(
				raw,
				indent: string,
				name: string,
				attributes: string,
				body: string | undefined,
				offset: number
			) => {
				const written = REWRITE_BY_TAG.get(name)!.write(
					{ raw, attributes, indent, body, level: levelAt(base + offset) },
					page
				);
				if (written !== undefined) return written;
				// Kept as written, but a tag inside it is still written out. Past
				// the `<`, so this tag can't match itself again.
				const head = indent.length + 1;
				return raw.slice(0, head) + rewrite(raw.slice(head), base + offset + head);
			}
		);
	return rewrite(prose, 0);
}

/** An ATX heading's marker. */
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]|$)/gm;

/** The level of the last heading in `prose`, if it has one. */
function lastHeadingLevel(prose: string): number | undefined {
	return [...prose.matchAll(HEADING)].at(-1)?.[1].length;
}
