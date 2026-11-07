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
 */
import path from 'node:path';
import { Marked, type Token, type Tokens } from 'marked';
import { under } from '../utils/url.js';
import { splitFrontmatter } from './markdown-source.js';
import { docsBaseFrom, urlFor } from './paths.js';
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
export function brokenLinks(pages: SourcePage[], options: IndexOptions): BrokenLink[] {
	const site = siteOf(pages, options);
	const broken: BrokenLink[] = [];

	for (const page of pages) {
		for (const { href, line } of writtenLinks(page)) {
			const target = targetOf(href);
			const problem = target && problemWith(target, site);
			if (problem) broken.push({ file: page.file, line, link: href, problem });
		}
	}

	return broken.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

/**
 * The site as the check sees it. Every page read counts, titled or not: an
 * untitled page is in no index, but SvelteKit still serves it, so a link to it
 * works.
 */
function siteOf(pages: SourcePage[], options: IndexOptions): Site {
	return {
		docsBase: docsBaseFrom(options.routesDir, options.contentDir),
		pages: new Set(pages.map((page) => urlFor(options.routesDir, path.dirname(page.file))))
	};
}

/**
 * Where a link points, when that is a path on this site: one starting with `/`.
 * A link with a scheme (`https:`, `mailto:`) or starting `//` names another
 * origin and is left alone.
 */
function targetOf(href: string): Target | undefined {
	if (!href.startsWith('/') || href.startsWith('//')) return undefined;
	const hash = href.indexOf('#');
	const beforeHash = hash === -1 ? href : href.slice(0, hash);
	const fragment = hash === -1 ? undefined : href.slice(hash + 1);
	return { path: beforeHash.split('?')[0], fragment };
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
			if (token.type === 'link' || token.type === 'codespan') {
				const firstLine = token.raw.split('\n', 1)[0];
				const at = block.raw.indexOf(firstLine, cursor);
				const start = at === -1 ? cursor : at;
				if (at !== -1) cursor = at + firstLine.length;
				if (token.type === 'link') {
					links.push({
						href: (token as Tokens.Link).href,
						line: blockLine + newlines(block.raw.slice(0, start))
					});
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
