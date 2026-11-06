/**
 * The three generated indexes, each a projection of the same page list. Nothing
 * here reads the filesystem or spawns a process: a build hands these functions
 * pages read by `./pages.js`, and a test hands them literals. Both go down the
 * same path, so what the sidebar, search and llms.txt show is decided in one
 * place and can be checked without a docs root on disk.
 */
import path from 'node:path';
import type { DocsContentItem, LlmsDoc, SearchDoc } from '#lib/core/content.js';
import type { DocsVersions } from '#lib/core/version.js';
import { sectionPath } from '#lib/core/reading-order.js';
import { firstSegmentUnder } from '#lib/utils/url.js';
import { docsBaseFrom, relativeToCwd, urlFor } from '../paths.js';
import { titleOf, type SourcePage } from './pages.js';
import { extractLlmsContent, extractSearchText, extractToc, readingMinutes } from './extract.js';
import { customFields, readField } from './fields.js';

/** Where the pages sit, which is what turns a page's file into a URL and a version. */
export type IndexOptions = {
	/** The docs root the pages were read from. */
	contentDir: string;
	/** Routes root, so `<routes>/docs/intro/+page.md` becomes `/docs/intro`. */
	routesDir: string;
	/** Declared versions, when the site has them. */
	versions?: DocsVersions;
};

/** A page resolved against the site's layout: its URL, title and owning version. */
type IndexedPage = SourcePage & { url: string; title: string; version: string | undefined };

/**
 * Resolve every titled page against the site's layout. Shared by all three
 * indexes so they can never disagree about which pages exist or where they live.
 */
function indexedPages(pages: SourcePage[], options: IndexOptions): IndexedPage[] {
	const resolved: IndexedPage[] = [];
	const docsBase = docsBaseFrom(options.routesDir, options.contentDir);

	for (const page of pages) {
		const title = titleOf(page);
		if (title === undefined) continue;
		const url = urlFor(options.routesDir, path.dirname(page.file));
		resolved.push({ ...page, url, title, version: versionOf(url) });
	}

	// Stable output keeps the generated modules diff-friendly across rebuilds.
	return resolved.sort((a, b) => a.url.localeCompare(b.url));

	/**
	 * A page belongs to an archived version when the first segment of its URL below
	 * the docs base is that archive's id; everything else is the current version,
	 * which lives unprefixed at the docs base.
	 *
	 * Decided in URL space, by the same rule `activeVersion` applies to the reader's
	 * pathname at runtime. Deciding it from the directory instead would be a second
	 * rule for the same question, in a second vocabulary, free to drift from the one
	 * the reader is actually served by. No versions ⇒ undefined, which keeps an
	 * unversioned site's index byte-for-byte what it was.
	 */
	function versionOf(url: string): string | undefined {
		const { versions } = options;
		if (!versions) return undefined;
		const segment = firstSegmentUnder(url, docsBase);
		const archived = versions.archived?.find((v) => v.id === segment);
		return archived ? archived.id : versions.current.id;
	}
}

/**
 * The most-specific group the sidebar puts the page in, for the compact
 * search-result pill. A page that names no section gets no pill.
 */
function sectionLabel(front: Record<string, unknown>): string | undefined {
	const section = readField(front, 'section');
	return section === undefined ? undefined : sectionPath(section).at(-1);
}

/**
 * A page's custom fields, or `undefined` when it has none, so a page without
 * them adds nothing to the eagerly-loaded content index.
 */
function dataOf(front: Record<string, unknown>): Record<string, unknown> | undefined {
	const fields = customFields(front);
	return Object.keys(fields).length ? fields : undefined;
}

/**
 * The sidebar's index: the frontmatter fields navigation needs, plus the heading
 * list for a server-rendered TOC and an estimated reading time. Served as the
 * eagerly-imported `svelte-docsmith/content` virtual module.
 *
 * `lastUpdated` is read off the page rather than looked up here, so pass pages
 * that have been through `withCommitDates` or the column comes out blank.
 */
export function contentIndex(pages: SourcePage[], options: IndexOptions): DocsContentItem[] {
	return indexedPages(pages, options).map((page) => ({
		title: page.title,
		path: page.url,
		description: readField(page.frontmatter, 'description'),
		section: readField(page.frontmatter, 'section'),
		order: readField(page.frontmatter, 'order'),
		sourcePath: relativeToCwd(page.file),
		lastUpdated: page.lastUpdated,
		readingTime: readingMinutes(extractSearchText(page.source)),
		toc: extractToc(page.source),
		version: page.version,
		data: dataOf(page.frontmatter)
	}));
}

/**
 * The search index: title, section, description, heading list, and plain-text
 * body. Served as the lazy-loaded `svelte-docsmith/search` virtual module so
 * search can index bodies without bloating the eagerly-imported content index.
 */
export function searchIndex(pages: SourcePage[], options: IndexOptions): SearchDoc[] {
	return indexedPages(pages, options).map((page) => ({
		path: page.url,
		title: page.title,
		section: sectionLabel(page.frontmatter),
		description: readField(page.frontmatter, 'description'),
		headings: extractToc(page.source).map((entry) => entry.title),
		text: extractSearchText(page.source),
		version: page.version
	}));
}

/**
 * The LLM index: title, section, description, and the full markdown content.
 * Served as the `svelte-docsmith/llms` virtual module and consumed server-side
 * by `llms.txt` / `llms-full.txt` routes, so it never ships to the client.
 *
 * `rewrite` turns a page's markdown into agent markdown (see
 * `./agent-markdown.js`); without it, the content is the page as written.
 */
export function llmsIndex(
	pages: SourcePage[],
	options: IndexOptions,
	rewrite: (content: string, page: SourcePage) => string = (content) => content
): LlmsDoc[] {
	return indexedPages(pages, options).map((page) => ({
		path: page.url,
		title: page.title,
		section: readField(page.frontmatter, 'section'),
		order: readField(page.frontmatter, 'order'),
		description: readField(page.frontmatter, 'description'),
		content: rewrite(extractLlmsContent(page.source, page.title), page),
		version: page.version
	}));
}
