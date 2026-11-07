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
import GithubSlugger from 'github-slugger';
import path from 'node:path';
import { Marked, type Token, type Tokens } from 'marked';
import { under } from '../utils/url.js';
import { splitFrontmatter } from './markdown-source.js';
import { docsBaseFrom, relativeToCwd, urlFor } from './paths.js';
import type { IndexOptions } from './vite/collect.js';
import type { SourcePage } from './vite/pages.js';

/** Why a link is broken. */
export type LinkProblem =
	| {
			/** The path is under the docs base, but no page of any version lives there. */
			type: 'no-page';
			/** The path the link points at. */
			path: string;
	  }
	| {
			/** The page exists, but has no anchor the link's fragment names. */
			type: 'no-anchor';
			/** The page the link points at: the page it is written on, for `#x`. */
			path: string;
			/** The fragment as written, without the `#`. */
			anchor: string;
			/** Every anchor the page does have, in page order, so the author can pick one. */
			anchors: string[];
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
	/** The anchors of the page at a URL, read the first time a link asks. */
	anchors: (url: string) => string[];
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
		const url = pageUrl(page, options);
		for (const { href, line } of writtenLinks(page)) {
			const target = targetOf(href, url);
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
	if (problem.type === 'no-anchor') {
		const has = problem.anchors.map((anchor) => `#${anchor}`).join(', ') || 'none';
		return `no anchor #${problem.anchor} on ${problem.path} (has: ${has})`;
	}
	return `no page at ${problem.path}`;
}

/** The URL SvelteKit serves `page` at. */
function pageUrl(page: SourcePage, options: IndexOptions): string {
	return urlFor(options.routesDir, path.dirname(page.file));
}

/**
 * The site as the check sees it. Every page read counts, titled or not: an
 * untitled page is in no index, but SvelteKit still serves it, so a link to it
 * works.
 *
 * A page's anchors cost a parse, so they are read only for pages a fragment
 * points at, once each.
 */
function siteOf(pages: SourcePage[], options: IndexOptions): Site {
	const byUrl = new Map(pages.map((page) => [pageUrl(page, options), page]));
	const anchors = new Map<string, string[]>();
	return {
		docsBase: docsBaseFrom(options.routesDir, options.contentDir),
		pages: new Set(byUrl.keys()),
		anchors: (url) => {
			let found = anchors.get(url);
			if (!found) anchors.set(url, (found = anchorsOf(byUrl.get(url)!)));
			return found;
		}
	};
}

/**
 * Where a link points, when that is a path on this site: one starting with `/`,
 * or a same-page `#fragment`, which points at `writtenOn`, the URL of the page
 * it is written on. A link with a scheme (`https:`, `mailto:`) or starting `//`
 * names another origin and is left alone.
 */
function targetOf(href: string, writtenOn: string): Target | undefined {
	if (href.startsWith('#')) return { path: writtenOn, fragment: href.slice(1) };
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
	if (target.fragment && !hasAnchor(site.anchors(target.path), target.fragment)) {
		const anchors = site.anchors(target.path);
		return { type: 'no-anchor', path: target.path, anchor: target.fragment, anchors };
	}
	return undefined;
}

/**
 * Whether a fragment lands on one of a page's anchors, as a browser finds it:
 * the fragment as written or percent-decoded (`#caf%C3%A9` is `#café`), and
 * `#top`, which scrolls to the top of any page. An empty fragment (`/docs/x#`)
 * never reaches here: it names no anchor.
 */
function hasAnchor(anchors: string[], fragment: string): boolean {
	if (anchors.includes(fragment) || fragment.toLowerCase() === 'top') return true;
	try {
		return anchors.includes(decodeURIComponent(fragment));
	} catch {
		return false;
	}
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

// --- reading anchors --------------------------------------------------------

/**
 * Every anchor a page has, in page order: each heading's id, of every level,
 * and each `id` written by hand on an HTML tag in its markdown.
 *
 * Heading ids are what `rehype-slug` gives the compiled page: one
 * `github-slugger` per page, fed each heading's text in order, so a repeated
 * heading gets `-1`, `-2` as it does there. `extractToc` slugs the same way but
 * sees only h2 and h3, and a link may name any heading. Headings and tags in
 * fenced, indented or inline code are code, and give the page no anchor. A test
 * compiles a page and pins these ids to the ones it renders.
 */
function anchorsOf(page: SourcePage): string[] {
	const slugger = new GithubSlugger();
	const anchors = new Set<string>();
	const visit = (token: Token) => {
		if (token.type === 'heading') {
			const id = slugger.slug(headingText((token as Tokens.Heading).tokens));
			if (id) anchors.add(id);
		}
		if (token.type === 'html') for (const id of writtenIds(token.raw)) anchors.add(id);
		childrenOf(token).forEach(visit);
	};
	markdown.lexer(splitFrontmatter(page.source).body).forEach(visit);
	return [...anchors];
}

/**
 * A heading's text as `rehype-slug` reads it from the compiled heading: the
 * text of its text nodes. So inline code keeps its text, a link or emphasis
 * gives its own, and an inline tag or image gives nothing.
 *
 * marked hands over text as written, where mdsvex has already decoded entities
 * and run smartypants, which turns `--` into an em dash. Both are redone here,
 * as far as a slug can tell them apart (see {@link decodeEntities}).
 */
function headingText(tokens: Token[] = []): string {
	return tokens
		.map((token) => {
			if (token.type === 'escape' || token.type === 'codespan') return token.text as string;
			if (token.type === 'text' && !token.tokens?.length) {
				return decodeEntities(token.text as string).replace(/(?<!-)--(?!-)/g, '—');
			}
			if (token.type === 'html' || token.type === 'image') return '';
			return 'tokens' in token && Array.isArray(token.tokens) ? headingText(token.tokens) : '';
		})
		.join('');
}

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

/**
 * Decode the character references in heading text. Numeric ones and the
 * common named ones decode exactly. Any other named one decodes to nothing:
 * nearly all of them name a symbol, which `github-slugger` drops anyway, where
 * leaving it would slug its name (`&copy;` as `copy`). An entity for a letter
 * (`&eacute;`) is the one case this gets wrong; a heading would write `é`.
 */
function decodeEntities(text: string): string {
	return text.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]*);/gi, (_, name: string) => {
		if (name[0] !== '#') return NAMED_ENTITIES[name] ?? '';
		const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : +name.slice(1);
		return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
	});
}

/**
 * The `id`s written on tags in a piece of HTML: quoted either way, or bare.
 * `id={...}` is a Svelte expression, unknown until the page runs, so it gives
 * no anchor. Script and style blocks are code, not tags, and are skipped.
 */
function writtenIds(html: string): string[] {
	const tags = html.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '');
	const ids = tags.matchAll(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`{}]+))/g);
	return [...ids].map((match) => match[1] ?? match[2] ?? match[3]).filter(Boolean);
}
