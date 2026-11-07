/**
 * The broken-link check: every link a doc page writes to a path under the docs
 * base, checked against the pages the site has. A whole-site pass rather than
 * part of each page's compile, because whether a link is broken depends on
 * other pages.
 *
 * Pure, like the index builders in `./vite/collect.js`: the plugin hands it the
 * pages it read and reports what comes back, and a test hands it literals. It
 * runs in three steps, each its own function so a new rule lands in one place:
 *
 *  1. {@link writtenLinks} reads the links a page writes, with their lines.
 *  2. {@link targetOf} decides which of them point at a path on this site.
 *  3. {@link problemWith} checks that path against the {@link Site}.
 *
 * {@link brokenLinksReport} words the result; printing it is the plugin's job.
 */
import path from 'node:path';
import { Marked, type Token, type Tokens } from 'marked';
import { under } from '../utils/url.js';
import { splitFrontmatter } from './markdown-source.js';
import { docsBaseFrom, relativeToCwd, urlFor } from './paths.js';
import type { IndexOptions } from './vite/collect.js';
import type { SourcePage } from './vite/pages.js';

/** Why a link is broken. */
export type LinkProblem = {
	/** The path is under the docs base, but no page of any version lives there. */
	type: 'no-page';
	/** The path the link points at. */
	path: string;
};

/** One broken link: where it is written, what it says, and what is wrong with it. */
export type BrokenLink = {
	/** Absolute path of the page file that writes the link. */
	file: string;
	/** The 1-based line of the file the link starts on, frontmatter included. */
	line: number;
	/** The link's target as written, so the author can find it. */
	link: string;
	problem: LinkProblem;
};

/** Where the docs live, and which routes beside the doc pages serve a page. */
export type LinkCheckOptions = IndexOptions & {
	/**
	 * Absolute paths of the `+page.*` route files under the content directory,
	 * such as a `+page.svelte`. The check reads no links from them, but SvelteKit
	 * serves each as a page, so a link to one is not a broken link. Doc pages may
	 * be listed too: they count either way.
	 */
	pageRoutes?: string[];
};

/** What the check knows about the site a link points into. */
type Site = {
	/** The docs base, e.g. `/docs`. Only links under it are checked. */
	docsBase: string;
	/** The URL of every page, of every version. */
	pages: Set<string>;
};

/** A link written in a page, before anything has decided what it points at. */
type WrittenLink = {
	/** The link's target as written. */
	href: string;
	/** The 1-based line of the file it starts on. */
	line: number;
};

/** A path on this site that a link points at. */
type Target = {
	/** The path alone, without query or fragment. */
	path: string;
	/** What follows `#`, when there is one. */
	fragment?: string;
};

/**
 * Every broken link in `pages`, sorted by page file, then line.
 *
 * A link to any page of any version is valid, so a link from the current docs
 * to `/docs/v1/intro` holds as long as v1 has that page. Archiving rewrites an
 * archive's own links to stay inside it, so no rule here needs to know which
 * version a page belongs to.
 */
export function brokenLinks(pages: SourcePage[], options: LinkCheckOptions): BrokenLink[] {
	const site = siteOf(pages, options);
	const broken: BrokenLink[] = [];

	for (const page of pages) {
		const pageUrl = urlFor(options.routesDir, path.dirname(page.file));
		for (const { href, line } of writtenLinks(page)) {
			const target = targetOf(href, pageUrl);
			const problem = target && problemWith(target, site);
			if (problem) broken.push({ file: page.file, line, link: href, problem });
		}
	}

	return broken.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

/**
 * The report of `broken`, as the plugin prints it: a count, then one line per
 * link, `file:line  <link as written>  <what is wrong>`, in the order given
 * ({@link brokenLinks} sorts by page file). Files are relative to the working
 * directory, the path an author would type to open them.
 */
export function brokenLinksReport(broken: BrokenLink[]): string {
	const count = broken.length === 1 ? '1 broken link' : `${broken.length} broken links`;
	const lines = broken.map(
		({ file, line, link, problem }) =>
			`  ${relativeToCwd(file)}:${line}  ${link}  ${describeProblem(problem)}`
	);
	return [`[svelte-docsmith] ${count} in doc pages`, ...lines].join('\n');
}

function describeProblem(problem: LinkProblem): string {
	return `no page at ${problem.path}`;
}

/**
 * The site as the check sees it. Every page read counts, titled or not: an
 * untitled page is in no index, but SvelteKit still serves it, so a link to it
 * works. So does every other `+page.*` route the plugin found beside them.
 */
function siteOf(pages: SourcePage[], options: LinkCheckOptions): Site {
	const files = [...pages.map((page) => page.file), ...(options.pageRoutes ?? [])];
	return {
		docsBase: docsBaseFrom(options.routesDir, options.contentDir),
		pages: new Set(files.map((file) => urlFor(options.routesDir, path.dirname(file))))
	};
}

/**
 * Where a link points, when that is a path on this site: one starting with `/`,
 * or a relative one starting `./` or `../`, which resolves against `pageUrl`. A
 * link with a scheme (`https:`, `mailto:`) or starting `//` names another
 * origin and is left alone.
 *
 * The path is reduced to the page it reaches: the query string goes, and so do
 * one trailing slash and a trailing `.md`, since `/docs/intro.md` is the agent
 * markdown twin of `/docs/intro` and stands or falls with it.
 */
function targetOf(href: string, pageUrl: string): Target | undefined {
	const relative = href.startsWith('./') || href.startsWith('../');
	if (!relative && (!href.startsWith('/') || href.startsWith('//'))) return undefined;
	const hash = href.indexOf('#');
	const beforeHash = hash === -1 ? href : href.slice(0, hash);
	const fragment = hash === -1 ? undefined : href.slice(hash + 1);
	const written = beforeHash.split('?')[0];
	return { path: pagePathOf(relative ? resolveRelative(written, pageUrl) : written), fragment };
}

/**
 * `relative` resolved against `pageUrl` the way a browser resolves it: pages
 * are served without a trailing slash, so `./theming` on `/docs/guide/setup`
 * is the sibling `/docs/guide/theming`, and `../intro` is `/docs/intro`.
 * Segment by segment rather than through `URL`, which would percent-encode the
 * path and stop it matching a page directory named as written.
 */
function resolveRelative(relative: string, pageUrl: string): string {
	const segments = pageUrl.split('/').slice(1, -1);
	for (const segment of relative.split('/')) {
		if (segment === '..') segments.pop();
		else if (segment !== '.') segments.push(segment);
	}
	return '/' + segments.join('/');
}

/** `urlPath` without one trailing slash, then without a trailing `.md`. */
function pagePathOf(urlPath: string): string {
	const trimmed = urlPath.length > 1 && urlPath.endsWith('/') ? urlPath.slice(0, -1) : urlPath;
	return trimmed.endsWith('.md') ? trimmed.slice(0, -'.md'.length) : trimmed;
}

/**
 * What is wrong with a link to `target`, if anything. A path outside the docs
 * base (`/`, `/llms.txt`, `/changelog`) belongs to the rest of the app, which
 * DocSmith doesn't know the routes of, so it is never a broken link.
 */
function problemWith(target: Target, site: Site): LinkProblem | undefined {
	if (!under(target.path, site.docsBase)) return undefined;
	if (!site.pages.has(target.path)) return { type: 'no-page', path: target.path };
	return undefined;
}

// --- reading links ----------------------------------------------------------

/**
 * A private instance, so an extension someone registers on marked's shared
 * one can't change how pages are read. GFM, as mdsvex reads pages, so links in
 * tables are seen.
 */
const markdown = new Marked({ gfm: true });

/**
 * The markdown links a page writes, in order, with the line each starts on.
 *
 * Read from a markdown parse rather than a regex, so links inside fenced and
 * indented code blocks and inline code are never seen, and reference links
 * arrive with their definition's target. Images are not links to pages.
 *
 * marked's top-level tokens slice the body exactly, so each block's offset is
 * exact. Within a block, nested tokens may have had a list's indentation or a
 * quote's `>` stripped from their continuation lines, but never from their
 * first line, so each link is found by its first line, searching on from the
 * last link or code span found. Stepping past code spans too is what stops a
 * link written earlier in inline code from claiming the real link's line.
 */
function writtenLinks(page: SourcePage): WrittenLink[] {
	const { body } = splitFrontmatter(page.source);
	const text = body.replace(/\r\n?/g, '\n');
	const links: WrittenLink[] = [];
	let blockLine = 1 + newlines(page.source.slice(0, page.source.length - body.length));

	for (const block of markdown.lexer(text)) {
		let cursor = 0;
		const visit = (token: Token) => {
			if (token.type === 'link' || token.type === 'codespan' || token.type === 'html') {
				const firstLine = token.raw.split('\n', 1)[0];
				const at = block.raw.indexOf(firstLine, cursor);
				const start = at === -1 ? cursor : at;
				if (at !== -1) cursor = at + firstLine.length;
				const tokenLine = blockLine + newlines(block.raw.slice(0, start));
				if (token.type === 'link') {
					links.push({ href: (token as Tokens.Link).href, line: tokenLine });
				}
				if (token.type === 'html') {
					for (const { href, offset } of anchorHrefs(token.raw)) {
						links.push({ href, line: tokenLine + newlines(token.raw.slice(0, offset)) });
					}
				}
				return;
			}
			childrenOf(token).forEach(visit);
		};
		visit(block);
		blockLine += newlines(block.raw);
	}

	return links;
}

/**
 * Markup in raw HTML that never renders as a link: comments, and the bodies of
 * `<script>` and `<style>`, where `<a href>` can only be text in a string.
 */
const NOT_MARKUP = /<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1\s*>/gi;

/**
 * An `<a>` tag's `href="…"` or `href='…'`, captured whole in group 1 and its
 * value in group 2 or 3. Quoted values and Svelte `{…}` attributes are stepped
 * over whole, so neither an `href=` inside another attribute's value nor a `>`
 * inside an expression ends the search early. An `href={…}` never matches: it
 * is only known at runtime.
 */
const ANCHOR_HREF =
	/<a(?=[\s/>])(?:[^>"'{]|"[^"]*"|'[^']*'|\{[^}]*\})*?\s(href\s*=\s*(?:"([^"]*)"|'([^']*)'))/gi;

/**
 * The `href` of every `<a>` in a piece of raw HTML a page writes, each with the
 * offset of its `href` attribute in `html`, so a tag spread over lines reports
 * the line its link is on. A quoted value that interpolates (`"/docs/{slug}"`)
 * is skipped like a bare expression: no build-time path to check.
 */
function anchorHrefs(html: string): { href: string; offset: number }[] {
	const markup = html.replace(NOT_MARKUP, (text) => text.replace(/[^\n]/g, ' '));
	const found: { href: string; offset: number }[] = [];
	for (const match of markup.matchAll(ANCHOR_HREF)) {
		const href = (match[2] ?? match[3]).trim();
		if (href.includes('{')) continue;
		found.push({ href, offset: match.index + match[0].length - match[1].length });
	}
	return found;
}

/** A token's nested tokens, wherever its type keeps them. */
function childrenOf(token: Token): Token[] {
	if (token.type === 'table') {
		const table = token as Tokens.Table;
		return [...table.header, ...table.rows.flat()].flatMap((cell) => cell.tokens);
	}
	if (token.type === 'list') return (token as Tokens.List).items;
	return 'tokens' in token && Array.isArray(token.tokens) ? token.tokens : [];
}

function newlines(text: string): number {
	let count = 0;
	for (const char of text) if (char === '\n') count++;
	return count;
}
