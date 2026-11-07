/**
 * Outside paths at build time: what `docsmith({ links: { outside } })` does to
 * doc pages beyond the broken-link check (which skips them in `./links.js`).
 *
 *  - {@link checkOutsidePaths} fails startup when a doc page's own URL is under
 *    an outside path: the config says something else serves that URL while
 *    this app serves a page there, and only one of them can be true.
 *  - {@link rehypeOutsidePaths} marks every link to an outside path
 *    `rel="external"` as pages compile, so SvelteKit's crawler skips it during
 *    prerender and the client router hands it to the server.
 *
 * Matching itself is `isOutsidePath` in `core/`, shared with the shell, which
 * marks the site config's links the same way in the browser.
 */
import path from 'node:path';
import { isOutsidePath } from '../core/outside-path.js';
import { relativeToCwd, urlFor } from './paths.js';
import type { IndexOptions } from './vite/collect.js';
import type { SourcePage } from './vite/pages.js';

/** What the compiler needs to know which links point at an outside path. */
export interface OutsidePathsOptions {
	/** The outside paths, as `docsmith()` resolves them. */
	outside: readonly string[];
	/** Absolute routes root, to give a page the URL its relative links resolve against. */
	routesDir: string;
}

/**
 * Throw when any page in `pages` is served under an outside path, naming every
 * such page with its URL and the prefix it falls under, so they are fixed in
 * one pass. Every page counts, titled or not, since SvelteKit serves them all.
 */
export function checkOutsidePaths(
	pages: SourcePage[],
	options: Pick<IndexOptions, 'routesDir'>,
	outside: readonly string[]
): void {
	if (!outside.length) return;
	const clashes: string[] = [];
	for (const page of pages) {
		const url = urlFor(options.routesDir, path.dirname(page.file));
		const prefix = outside.find((p) => isOutsidePath(url, [p]));
		if (prefix) {
			clashes.push(`  ${relativeToCwd(page.file)}  ${url}  under outside path '${prefix}'`);
		}
	}
	if (!clashes.length) return;
	const count = clashes.length === 1 ? 'A doc page is' : `${clashes.length} doc pages are`;
	throw new Error(
		`[svelte-docsmith] ${count} served under an outside path, which links.outside ` +
			'says something other than this app serves:\n' +
			clashes.join('\n') +
			'\n  Remove the prefix from links.outside, or move the page out from under it.'
	);
}

/** The few hast node fields the step reads; mdsvex brings no hast types. */
type HastNode = {
	type: string;
	tagName?: string;
	value?: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
};

/**
 * DocSmith's rehype step that adds `external` to the `rel` of every link to an
 * outside path, keeping any `rel` already there. It runs ahead of the author's
 * `rehypePlugins`, so they see links as the page will render them.
 *
 * A markdown link reaches it as an `a` element. A raw `<a>` written in
 * markdown doesn't: mdsvex never parses HTML, so it arrives as a `raw` node,
 * the tag's text alone inline or a whole block of markup, and is rewritten as
 * text. An `href={...}` is a Svelte expression with no value until runtime, so
 * it is left alone, as is a `rel={...}` it couldn't add to.
 *
 * Relative hrefs (`./x`, `../x`) resolve against the page's URL, as the
 * crawler resolves them, which only a file under the routes root has.
 */
export function rehypeOutsidePaths({ outside, routesDir }: OutsidePathsOptions) {
	return () => (tree: HastNode, file: { filename?: string }) => {
		if (!outside.length) return;
		const pageUrl = pageUrlOf(file.filename, routesDir);
		const isOutside = (href: string) => {
			const target = siteAbsolute(href, pageUrl);
			return target !== undefined && isOutsidePath(target, outside);
		};
		const visit = (node: HastNode) => {
			if (node.type === 'element' && node.tagName === 'a') markElement(node, isOutside);
			else if (node.type === 'raw' && node.value) node.value = markRaw(node.value, isOutside);
			node.children?.forEach(visit);
		};
		visit(tree);
	};
}

/** The URL of the page in `filename`, or `undefined` when it is not under the routes root. */
function pageUrlOf(filename: string | undefined, routesDir: string): string | undefined {
	if (!filename || !path.isAbsolute(filename)) return undefined;
	const rel = path.relative(routesDir, path.dirname(filename));
	if (rel.startsWith('..') || path.isAbsolute(rel)) return undefined;
	return urlFor(routesDir, path.dirname(filename));
}

/**
 * `href` as a site-absolute path, when it is a same-origin path: as written
 * when it starts with `/`, resolved against `pageUrl` when it starts `./` or
 * `../`. Anything with a scheme or starting `//` names another origin.
 */
function siteAbsolute(href: string, pageUrl: string | undefined): string | undefined {
	if (href.startsWith('//')) return undefined;
	if (href.startsWith('/')) return href;
	if (pageUrl === undefined || !/^\.\.?\//.test(href)) return undefined;
	return new URL(href, `http://docsmith.invalid${pageUrl}`).pathname;
}

function markElement(node: HastNode, isOutside: (href: string) => boolean) {
	const properties = (node.properties ??= {});
	const href = properties.href;
	if (typeof href !== 'string' || !isOutside(href)) return;
	const rel = properties.rel;
	const values = Array.isArray(rel)
		? rel.map(String)
		: typeof rel === 'string'
			? rel.split(/\s+/)
			: [];
	if (!values.includes('external')) properties.rel = [...values.filter(Boolean), 'external'];
}

/**
 * An `<a>` opening tag: attributes may be quoted or a Svelte expression, either
 * of which may hold a `>`.
 */
const A_TAG = /<a(\s(?:"[^"]*"|'[^']*'|\{[^}]*\}|[^>"'{])*)>/gi;
const HREF = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`{]+))/i;
const REL = /(\s)rel\s*=\s*(?:"([^"]*)"|'([^']*)'|(\{[^}]*\})|([^\s"'=<>`{]+))/i;

/** `html` with `external` added to the `rel` of each `<a>` to an outside path. */
function markRaw(html: string, isOutside: (href: string) => boolean): string {
	return html.replace(A_TAG, (tag, attributes: string) => {
		const href = HREF.exec(attributes);
		const value = href && (href[1] ?? href[2] ?? href[3]);
		if (!value || !isOutside(value)) return tag;

		const rel = REL.exec(attributes);
		if (!rel) return `<a${attributes.trimEnd()} rel="external">`;
		if (rel[4] !== undefined) return tag;
		const existing = rel[2] ?? rel[3] ?? rel[5] ?? '';
		if (existing.split(/\s+/).includes('external')) return tag;
		const merged = `${rel[1]}rel="${`${existing} external`.trim()}"`;
		// A function, so a `$` in the existing value is never read as a pattern.
		return `<a${attributes.replace(rel[0], () => merged)}>`;
	});
}
