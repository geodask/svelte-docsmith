import { outsideCodeFenceRuns, proseLines, splitFrontmatter } from '../markdown-source.js';
import { readPage } from '../page-reading.js';

export type TocEntry = { id: string; title: string; depth: 2 | 3 };

/**
 * Drop a page's `<script>`/`<style>` blocks: component setup, not content. One
 * inside a fenced code sample is part of the sample, and stays. A top-level one
 * is read whole, so a fence-like line in its code neither splits it nor opens a
 * fence.
 */
function withoutSetupBlocks(body: string): string {
	return outsideCodeFenceRuns(
		body,
		(prose) =>
			prose.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, ''),
		{ setupBlocks: true }
	);
}

/**
 * Drop formulas, as search drops code, by the rules `remark-math` reads them
 * with (see `../math.ts`): a `$$` block on lines of its own, and `$…$` or
 * `$$…$$` in a line whose opener has no space after it and whose closer has no
 * space before it and no digit after. Inline code is never a formula, so
 * "$5 or $10" and `` `$state` `` stay.
 */
function withoutFormulas(body: string): string {
	const DISPLAY = /^[ \t]{0,3}\$\$[^\n]*\n[\s\S]*?^[ \t]*\$\$[ \t]*$/gm;
	const INLINE = /(^|[^\\${])(\$\$?)(?![\s$])(?:\\.|[^$\\\n])*?[^\s\\]\2(?!\d)/g;
	return outsideCodeFenceRuns(body, (prose) =>
		prose
			.replace(DISPLAY, ' ')
			// Split around code spans: every third part is a span's backtick run
			// (from the inner group), dropped; the code spans themselves are kept.
			.split(/((`+)[\s\S]*?\2)/)
			.map((part, i) => (i % 3 === 0 ? part.replace(INLINE, '$1 ') : i % 3 === 1 ? part : ''))
			.join('')
	);
}

/** Strip inline markdown, so search text is plain words. */
function stripInlineMarkdown(text: string): string {
	return text
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[_~]/g, '')
		.trim();
}

/**
 * Reduce a markdown page to plain, searchable body text: prose and heading text
 * with frontmatter, `<script>`/`<style>` blocks, fenced code, HTML/Svelte tags,
 * and markdown punctuation removed. Feeds the generated search index. Code
 * samples are intentionally dropped to keep the index small and prose-focused.
 */
export function extractSearchText(
	source: string,
	{ math = false }: { math?: boolean } = {}
): string {
	const page = withoutSetupBlocks(splitFrontmatter(source).body);
	const body = math ? withoutFormulas(page) : page;
	const out: string[] = [];

	for (const line of proseLines(body)) {
		// Skip table delimiter rows (`| --- | :--: |`) — pure structure, no words.
		if (/^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line)) continue;

		const text = stripInlineMarkdown(
			line
				.replace(/<[^>]+>/g, ' ') // strip HTML/Svelte tags, keep their text content
				.replace(/^\s{0,3}#{1,6}\s+/, '') // heading markers
				.replace(/^\s{0,3}>\s?/, '') // blockquote markers
				.replace(/^\s*[-*+]\s+/, '') // unordered list bullets
				.replace(/^\s*\d+\.\s+/, '') // ordered list markers
				.replace(/\s*\|\s*/g, ' ') // table cell separators → spaces, not "| a | b |"
		).replace(/\s+/g, ' ');

		if (text) out.push(text);
	}

	return out.join(' ');
}

/** Estimated reading time in whole minutes from a page's plain-text body. */
export function readingMinutes(text: string): number {
	const words = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
}

/**
 * A page's `h2`/`h3` headings, so the in-page TOC can be server-rendered (no
 * post-hydration pop-in). The headings and their ids come from the page
 * reading (`../page-reading.js`), which gives each the id `rehype-slug` renders
 * and the broken-link check accepts, so a TOC link always lands.
 */
export function extractToc(source: string): TocEntry[] {
	return readPage(source).headings.flatMap(({ depth, id, title }) =>
		(depth === 2 || depth === 3) && id && title ? [{ id, title, depth }] : []
	);
}

/**
 * The page's markdown body for LLM output: frontmatter and `<script>`/`<style>`
 * blocks removed, everything else (headings, prose, code, component tags) kept,
 * with the frontmatter title prepended as an `h1` (pages start their body at h2).
 */
export function extractLlmsContent(source: string, title: string, since?: string): string {
	const body = withoutSetupBlocks(splitFrontmatter(source).body).trim();
	return since === undefined ? `# ${title}\n\n${body}` : `# ${title}\n\nSince ${since}\n\n${body}`;
}
