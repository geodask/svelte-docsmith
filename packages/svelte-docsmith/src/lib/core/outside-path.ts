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
 * Whether `path` is under an outside path: equal to one of `prefixes` or
 * beneath it on a segment boundary, so `/relative` covers `/relative/x` but
 * not `/relatives`. A trailing slash, query or fragment on `path` doesn't
 * change the answer, so an href can be passed as written once it is
 * site-absolute.
 *
 * `prefixes` are expected as `docsmith()` resolves them: each starting with
 * `/`, without a trailing slash.
 */
export function isOutsidePath(path: string, prefixes: readonly string[]): boolean {
	return path.startsWith('/') && prefixes.some((prefix) => under(path, prefix));
}
