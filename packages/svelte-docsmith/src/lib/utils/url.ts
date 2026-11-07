/**
 * The vocabulary for doc URLs: normalize one for matching, join two to build
 * one, and ask whether one sits under a base. Every layer that touches URL
 * space goes through here, because the alternative is what this replaced: the
 * same trailing-slash strip written with three different regexes and the same
 * segment-boundary rule written three times, quietly disagreeing.
 *
 * Pure string work over a URL's path space. Nothing here knows about docs,
 * versions or pages; the domain meaning lives in `core/`, which calls in.
 */

/**
 * Strip a trailing slash so route matching is consistent regardless of the
 * consumer's SvelteKit `trailingSlash` setting: `/docs/intro/` and `/docs/intro`
 * resolve to the same content entry. The root stays `/`.
 */
export function normalizePath(pathname: string): string {
	return pathname.replace(/\/+$/, '') || '/';
}

/**
 * A base as a string prefix. The site root addresses everything, so it has no
 * prefix: spelled `/`, the boundary check below would look for `//`. `''` and
 * `/` are therefore the same base, and callers may pass whichever they hold.
 * Reachable through `docsBaseFrom` when a site puts its docs at the routes root.
 */
function baseAsPrefix(base: string): string {
	return base === '/' ? '' : base;
}

/**
 * True when nothing follows a base, or what follows starts a new segment rather
 * than continuing the last one. `?` and `#` count, so the rule holds for a link
 * href as well as a pathname; that is what stops `/docs` from matching
 * `/docsmith`.
 *
 * Exported for the one caller that has already sliced the base off itself: the
 * archive link rewriter matches its base with a regex and needs the remainder
 * afterwards, so it checks the boundary rather than re-testing the whole URL.
 */
export function atBoundary(rest: string): boolean {
	return rest === '' || /^[/#?]/.test(rest);
}

/** True when `url` is `base` or sits beneath it on a segment boundary. */
export function under(url: string, base: string): boolean {
	const b = baseAsPrefix(base);
	return url.startsWith(b) && atBoundary(url.slice(b.length));
}

/**
 * The one segment directly below `base`, which is what decides who owns a URL:
 * an archived version owns `<docs base>/<id>/…`, and a header link owns its
 * whole first-segment section. `undefined` when `url` is not under `base` at
 * all, or when the base is the end of it, so callers must handle "no segment"
 * rather than interpolate it into a path.
 */
export function firstSegmentUnder(url: string, base: string): string | undefined {
	if (!under(url, base)) return undefined;
	const rest = url.slice(baseAsPrefix(base).length);
	if (!rest.startsWith('/')) return undefined;
	return rest.slice(1).split(/[/#?]/)[0] || undefined;
}

/**
 * Join two URL pieces with exactly one slash between them, whichever of them
 * already carries it. Use it for every URL built from a configured origin or
 * base, so a trailing slash in someone's config can never double up.
 *
 * Only the seam between the two is touched, never the rest of either: rescanning
 * would turn `https://x.dev` into `https:/x.dev`. Nor is the result normalized,
 * so `join(origin, '/')` still ends in a slash and a sitemap can carry the home
 * page.
 *
 * An empty `left` returns `right` untouched, which is what an unconfigured
 * origin needs: `llms.txt` and the copy-page menu fall back to site-relative
 * links rather than emitting a stray leading slash. Callers that must not degrade
 * to a relative URL, like `<link rel="canonical">`, have to check the origin
 * themselves.
 */
export function join(left: string, right: string): string {
	if (!left) return right;
	const l = left.replace(/\/+$/, '');
	if (!right) return l || '/';
	return l + '/' + right.replace(/^\/+/, '');
}

/**
 * The site-absolute path an href written on the page at `pageUrl` points at,
 * without its query or fragment, or `undefined` when it names another origin.
 * The one resolver behind both halves of outside paths, the broken-link check
 * and the compiler's `rel="external"`, so a link one accepts as an outside path
 * is a link the other marks.
 *
 * Only the forms a doc page links within the site by are resolved: a path
 * starting `/`, a relative one starting `./` or `../`, and a same-page
 * `#fragment`, which is the page itself. Anything with a scheme (`https:`,
 * `mailto:`) or starting `//` names another origin. A bare relative path
 * (`theming`) or a query alone is no form DocSmith reads, and is `undefined`
 * too, as is a relative href or fragment with no `pageUrl` to resolve against.
 *
 * Resolved as a browser resolves it, segment by segment: pages are served
 * without a trailing slash, so `./theming` on `/docs/guide/setup` is the
 * sibling `/docs/guide/theming`, and `../intro` is `/docs/intro`. Not through
 * `URL`, which percent-encodes, so a path would stop matching a directory named
 * as written (`café`). Each segment is percent-decoded instead, since remark
 * writes a markdown link's href encoded and a browser reads both spellings as
 * one path; `%2F` and its kin stay encoded, so decoding never adds a segment.
 * A trailing slash is kept: whether it matters is the caller's call (see
 * {@link normalizePath}).
 */
export function sitePathOf(href: string, pageUrl: string | undefined): string | undefined {
	let segments: string[];
	let written = href.split(/[?#]/, 1)[0];
	if (href.startsWith('#') || href.startsWith('./') || href.startsWith('../')) {
		if (pageUrl === undefined) return undefined;
		if (href.startsWith('#')) return pageUrl;
		segments = pageUrl.split('/').slice(1, -1);
	} else if (href.startsWith('/') && !href.startsWith('//')) {
		segments = [];
		written = written.slice(1);
	} else return undefined;

	for (const segment of written.split('/')) {
		if (segment === '..') segments.pop();
		else if (segment !== '.') segments.push(decodeSegment(segment));
	}
	return '/' + segments.join('/');
}

/** One path segment percent-decoded, or as written when it doesn't decode. */
function decodeSegment(segment: string): string {
	try {
		return decodeURI(segment);
	} catch {
		return segment;
	}
}
