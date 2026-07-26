/**
 * The three generated indexes, each a projection of the same page list. Nothing
 * here reads the filesystem or spawns a process: a build hands these functions
 * pages read by `./pages.js`, and a test hands them literals. Both go down the
 * same path, so what the sidebar, search and llms.txt show is decided in one
 * place and can be checked without a docs root on disk.
 */
import path from 'node:path';
import type { DocsContentItem, LlmsDoc, SearchDoc } from '$lib/core/content.js';
import type { DocsVersions } from '$lib/core/version.js';
import { firstSegmentUnder } from '$lib/utils/url.js';
import { docsBaseFrom, urlFor } from '../paths.js';
import { titleOf, type SourcePage } from './pages.js';
import { extractLlmsContent, extractSearchText, extractToc, readingMinutes } from './extract.js';

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
 * Read a page's `section` frontmatter: a string is one level, an array is a
 * nested group path. Non-string array members are dropped; anything else is
 * treated as no section.
 */
function readSection(value: unknown): string | string[] | undefined {
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) {
		const segs = value.filter((s): s is string => typeof s === 'string');
		return segs.length ? segs : undefined;
	}
	return undefined;
}

/** The most-specific (last) group segment, for the compact search-result pill. */
function sectionLabel(value: unknown): string | undefined {
	const section = readSection(value);
	if (section === undefined) return undefined;
	return Array.isArray(section) ? section[section.length - 1] : section;
}

/** The full group path joined, so nested pages group under one llms.txt heading. */
function sectionKey(value: unknown): string | undefined {
	const section = readSection(value);
	if (section === undefined) return undefined;
	return Array.isArray(section) ? section.join(' / ') : section;
}

/**
 * A frontmatter field, when it holds the type the index expects. Frontmatter is
 * whatever the author typed, so a field of the wrong type is dropped rather than
 * carried into the index as one.
 */
function stringField(front: Record<string, unknown>, key: string): string | undefined {
	return typeof front[key] === 'string' ? front[key] : undefined;
}

/** As {@link stringField}, for the numeric fields. */
function numberField(front: Record<string, unknown>, key: string): number | undefined {
	return typeof front[key] === 'number' ? front[key] : undefined;
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
		description: stringField(page.frontmatter, 'description'),
		section: readSection(page.frontmatter.section),
		order: numberField(page.frontmatter, 'order'),
		sourcePath: path.relative(process.cwd(), page.file).split(path.sep).join('/'),
		lastUpdated: page.lastUpdated,
		readingTime: readingMinutes(extractSearchText(page.source)),
		toc: extractToc(page.source),
		version: page.version
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
		section: sectionLabel(page.frontmatter.section),
		description: stringField(page.frontmatter, 'description'),
		headings: extractToc(page.source).map((entry) => entry.title),
		text: extractSearchText(page.source),
		version: page.version
	}));
}

/**
 * The LLM index: title, section, description, and the full markdown content.
 * Served as the `svelte-docsmith/llms` virtual module and consumed server-side
 * by `llms.txt` / `llms-full.txt` routes, so it never ships to the client.
 */
export function llmsIndex(pages: SourcePage[], options: IndexOptions): LlmsDoc[] {
	return indexedPages(pages, options).map((page) => ({
		path: page.url,
		title: page.title,
		section: sectionKey(page.frontmatter.section),
		order: numberField(page.frontmatter, 'order'),
		description: stringField(page.frontmatter, 'description'),
		content: extractLlmsContent(page.source, page.title),
		version: page.version
	}));
}
