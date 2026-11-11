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
 *  1. {@link readPage} reads the links a page writes, with their lines.
 *  2. {@link targetOf} decides which of them point at a path on this site.
 *  3. {@link problemWith} checks that path against the {@link Site}.
 *
 * {@link brokenLinksReport} words the result; printing it is the plugin's job.
 */
import { isOutsidePath, type OutsidePaths } from '../core/outside-path.js';
import { normalizePath, sitePathOf, under } from '../utils/url.js';
import { readPage } from './page-reading.js';
import { docsBaseFrom, pageUrlFor, relativeToCwd } from './paths.js';
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
	/** The anchors of the doc page at a URL; `undefined` for a route whose anchors the check can't read. */
	anchors: (url: string) => string[] | undefined;
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
 *
 * A link to an outside path is never broken, so the outside paths are passed
 * along; without them, no path is outside.
 */
export function brokenLinks(
	pages: SourcePage[],
	options: LinkCheckOptions,
	outside: OutsidePaths = []
): BrokenLink[] {
	const site = siteOf(pages, options);
	const broken: BrokenLink[] = [];

	for (const page of pages) {
		const url = pageUrlFor(options.routesDir, page.file);
		for (const { href, line } of readPage(page.source).links) {
			const target = targetOf(href, url);
			const problem = target && problemWith(target, site, outside);
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
	const lines = broken.map(
		({ file, line, link, problem }) =>
			`  ${relativeToCwd(file)}:${line}  ${link}  ${describeProblem(problem)}`
	);
	return [`[svelte-docsmith] ${brokenLinksCount(broken)} in doc pages`, ...lines].join('\n');
}

/**
 * How many links `broken` holds, in words: `1 broken link`, `3 broken links`.
 * Shared by the report and the error that fails the build after it, so the two
 * always count alike.
 */
export function brokenLinksCount(broken: BrokenLink[]): string {
	return broken.length === 1 ? '1 broken link' : `${broken.length} broken links`;
}

function describeProblem(problem: LinkProblem): string {
	if (problem.type === 'no-anchor') {
		const has = problem.anchors.map((anchor) => `#${anchor}`).join(', ') || 'none';
		return `no anchor #${problem.anchor} on ${problem.path} (has: ${has})`;
	}
	return `no page at ${problem.path}`;
}

/**
 * The site as the check sees it. Every page read counts, titled or not: an
 * untitled page is in no index, but SvelteKit still serves it, so a link to it
 * works. So does every other `+page.*` route the plugin found beside them.
 *
 * A page's anchors come from the same reading as its links and its table of
 * contents ({@link readPage}). A route that is no doc page, such as a `+page.svelte`,
 * has anchors the check can't read, so its are unknown.
 */
function siteOf(pages: SourcePage[], options: LinkCheckOptions): Site {
	const byUrl = new Map(pages.map((page) => [pageUrlFor(options.routesDir, page.file), page]));
	const routes = (options.pageRoutes ?? []).map((file) => pageUrlFor(options.routesDir, file));
	return {
		docsBase: docsBaseFrom(options.routesDir, options.contentDir),
		pages: new Set([...byUrl.keys(), ...routes]),
		anchors: (url) => {
			const page = byUrl.get(url);
			return page && readPage(page.source).anchors;
		}
	};
}

/**
 * Where a link points, when that is a path on this site, as {@link sitePathOf}
 * resolves it against `writtenOn`, the URL of the page it is written on: the
 * same resolver the compiler marks links to outside paths with, so the two
 * never disagree on where a link goes.
 *
 * The path is reduced to the page it reaches: a trailing slash goes, and so
 * does a trailing `.md`, since `/docs/intro.md` is the agent markdown twin of
 * `/docs/intro` and stands or falls with it.
 */
function targetOf(href: string, writtenOn: string): Target | undefined {
	const sitePath = sitePathOf(href, writtenOn);
	if (sitePath === undefined) return undefined;
	const hash = href.indexOf('#');
	const pagePath = normalizePath(sitePath);
	return {
		path: pagePath.endsWith('.md') ? pagePath.slice(0, -'.md'.length) : pagePath,
		fragment: hash === -1 ? undefined : href.slice(hash + 1)
	};
}

/**
 * What is wrong with a link to `target`, if anything. A path outside the docs
 * base (`/`, `/llms.txt`, `/changelog`) belongs to the rest of the app, which
 * DocSmith doesn't know the routes of, so it is never a broken link. Nor is an
 * outside path, even under the docs base: the author has said something other
 * than this app serves it.
 */
function problemWith(target: Target, site: Site, outside: OutsidePaths): LinkProblem | undefined {
	if (isOutsidePath(target.path, outside)) return undefined;
	if (!under(target.path, site.docsBase)) return undefined;
	if (!site.pages.has(target.path)) return { type: 'no-page', path: target.path };
	const anchors = target.fragment ? site.anchors(target.path) : undefined;
	if (target.fragment && anchors && !hasAnchor(anchors, target.fragment)) {
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
