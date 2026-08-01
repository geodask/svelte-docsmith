/**
 * The record types for the generated content indexes. The `docsmith()` Vite
 * plugin emits these at build time as the `svelte-docsmith/content`,
 * `/search`, and `/llms` virtual modules; any source with matching fields
 * satisfies them structurally.
 */

/**
 * The minimal shape `DocsShell` needs from each content entry to build the
 * sidebar. The generated `svelte-docsmith/content` module produces these from
 * your pages' frontmatter; any source with matching title/path/section/order
 * fields satisfies it structurally.
 */
export type DocsContentItem = {
	title: string;
	path: string;
	/**
	 * Sidebar group. A string places the page in a single top-level group; an
	 * array names a nested group path (e.g. `['Guides', 'Advanced']`), building
	 * collapsible subsections. Omitted pages fall under "Docs".
	 */
	section?: string | string[];
	order?: number;
	description?: string;
	/** Source file path relative to the app cwd, for the "Edit this page" link. */
	sourcePath?: string;
	/**
	 * The day (`YYYY-MM-DD`) the page's source file last changed, from git, or
	 * from the page's own `lastUpdated` frontmatter when it has one. Absent when
	 * neither source supplies a day — including on a shallow clone, where git
	 * dates would be wrong. A calendar day rather than a timestamp: it is
	 * rendered as a UTC day, so it reads the same for every reader and matches
	 * on the server and the client.
	 */
	lastUpdated?: string;
	/** Estimated reading time in whole minutes (at ~200 wpm), min 1. */
	readingTime?: number;
	/**
	 * The page's `h2`/`h3` headings, extracted at build time by the `docsmith()`
	 * vite plugin, so `DocsShell` can render the in-page TOC server-side. The
	 * runtime TOC engine still owns scroll-spy and re-scans the DOM.
	 */
	toc?: { id: string; title: string; depth: 2 | 3 }[];
	/**
	 * The id of the version this page belongs to, when the site declares
	 * versions (`docsmith({ versions })`). `undefined` on unversioned sites.
	 */
	version?: string;
};

/**
 * One page's searchable record, emitted at build time by the `docsmith()` vite
 * plugin as the `svelte-docsmith/search` virtual module. `text` is the page's
 * prose and headings reduced to plain text (frontmatter, `<script>` blocks,
 * fenced code, tags, and markdown punctuation stripped) so a client-side search
 * index can be built over it without shipping raw markdown.
 */
export type SearchDoc = {
	path: string;
	title: string;
	section?: string;
	description?: string;
	/** The page's `h2`/`h3` heading text, for weighting title/heading matches. */
	headings: string[];
	/** Plain-text body: prose and headings, code and markup removed. */
	text: string;
	/** The page's version id when the site declares versions; else `undefined`. */
	version?: string;
};

/**
 * One page's record for LLM-facing output, emitted at build time by the
 * `docsmith()` vite plugin as the `svelte-docsmith/llms` virtual module. Feeds
 * `generateLlmsTxt` (an index) and `generateLlmsFullTxt` (the full corpus).
 */
export type LlmsDoc = {
	path: string;
	title: string;
	section?: string;
	/** Sidebar order within the section, so LLM output follows reading order. */
	order?: number;
	description?: string;
	/** The page's markdown body (frontmatter and `<script>`/`<style>` removed,
	 *  headings and code kept), with the title prepended as an `h1`. */
	content: string;
	/** The page's version id when the site declares versions; else `undefined`. */
	version?: string;
};
