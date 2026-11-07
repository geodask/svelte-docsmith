/**
 * Outside paths: same-origin path prefixes that something other than this
 * SvelteKit app serves, like a Worker or proxy in front of a static build.
 * Declared once in `docsmith({ links: { outside } })`, and matched here for
 * every layer that has to agree on them: the broken-link check and the
 * markdown compiler at build time, and the shell's site config links in the
 * browser. One matcher, so a link the check accepts is the same link the page
 * marks `rel="external"`.
 */
import { under } from '../utils/url.js';

/**
 * The outside paths, as `docsmith()` resolves them: each starting with `/`,
 * without a trailing slash. The one shape they travel in, from the options to
 * the broken-link check, the compiler and the shell.
 */
export type OutsidePaths = readonly string[];

/**
 * Whether `path` is under an outside path: equal to one of `prefixes` or
 * beneath it on a segment boundary, so `/relative` covers `/relative/x` but
 * not `/relatives`. A trailing slash, query or fragment on `path` doesn't
 * change the answer, so an href can be passed as written once it is
 * site-absolute.
 *
 * `prefixes` are expected as `docsmith()` resolves them (see
 * {@link OutsidePaths}).
 */
export function isOutsidePath(path: string, prefixes: OutsidePaths): boolean {
	return path.startsWith('/') && prefixes.some((prefix) => under(path, prefix));
}

/**
 * The `rel` of a site config link (a `nav` or footer column link, or the
 * announcement), or `undefined` for none. A link under an outside path gets
 * `external`, so Kit's crawler skips it and the client router does a full page
 * load that whatever serves the path can answer. `external: true` on the link
 * itself is a different thing, a new tab, and keeps its `noopener noreferrer`
 * beside it.
 *
 * Only a site-absolute `href` is matched: a relative one resolves against
 * whichever page the shell is on, so there is no one path to match.
 */
export function siteLinkRel(
	link: { href: string; external?: boolean },
	outside: OutsidePaths
): string | undefined {
	const rel = [
		...(isOutsidePath(link.href, outside) ? ['external'] : []),
		...(link.external ? ['noopener', 'noreferrer'] : [])
	];
	return rel.length ? rel.join(' ') : undefined;
}
