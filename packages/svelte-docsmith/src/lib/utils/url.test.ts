import { describe, expect, it } from 'vitest';
import { atBoundary, firstSegmentUnder, join, normalizePath, sitePathOf, under } from './url.js';

describe('normalizePath', () => {
	it('strips a trailing slash', () => {
		expect(normalizePath('/docs/intro/')).toBe('/docs/intro');
	});

	it('leaves a path without a trailing slash unchanged', () => {
		expect(normalizePath('/docs/intro')).toBe('/docs/intro');
	});

	it('keeps the root as "/"', () => {
		expect(normalizePath('/')).toBe('/');
		expect(normalizePath('//')).toBe('/');
	});

	it('collapses multiple trailing slashes', () => {
		expect(normalizePath('/a///')).toBe('/a');
	});
});

describe('join', () => {
	it('puts exactly one slash between an origin and a path', () => {
		expect(join('https://x.dev', '/docs/intro')).toBe('https://x.dev/docs/intro');
		expect(join('https://x.dev/', '/docs/intro')).toBe('https://x.dev/docs/intro');
		expect(join('https://x.dev', 'docs/intro')).toBe('https://x.dev/docs/intro');
	});

	it('passes the path through when there is no origin', () => {
		expect(join('', '/docs/intro')).toBe('/docs/intro');
	});

	it('adds no trailing slash when the right side is empty', () => {
		expect(join('/docs/v1', '')).toBe('/docs/v1');
	});

	it('keeps a lone root base as "/"', () => {
		expect(join('/', '')).toBe('/');
		expect(join('/', 'v1')).toBe('/v1');
	});

	it('fixes only the seam, leaving the protocol slashes alone', () => {
		expect(join('https://x.dev//', '//docs/intro')).toBe('https://x.dev/docs/intro');
	});

	it('keeps a root path, so a sitemap can carry the home page', () => {
		expect(join('https://x.dev', '/')).toBe('https://x.dev/');
	});

	// How a configured link is anchored at the site root before it is matched
	// against the current path, so both spellings name the same page.
	it('anchors a site-relative path at the root either way', () => {
		expect(join('/', 'docs/intro')).toBe('/docs/intro');
		expect(join('/', '/docs/intro')).toBe('/docs/intro');
	});
});

// The archive link rewriter matches a base with a regex and checks the boundary
// on the remainder it captured, so it needs this on its own.
describe('atBoundary', () => {
	it('accepts the end of a URL and each separator that starts something new', () => {
		expect(atBoundary('')).toBe(true);
		expect(atBoundary('/theming')).toBe(true);
		expect(atBoundary('#anchor')).toBe(true);
		expect(atBoundary('?q=x')).toBe(true);
	});

	it('rejects a remainder that continues the last segment', () => {
		expect(atBoundary('mith')).toBe(false);
		expect(atBoundary('mith/x')).toBe(false);
	});
});

describe('under', () => {
	it('matches the base itself and paths beneath it', () => {
		expect(under('/docs', '/docs')).toBe(true);
		expect(under('/docs/intro', '/docs')).toBe(true);
	});

	it('does not match a longer sibling segment', () => {
		expect(under('/docsmith', '/docs')).toBe(false);
	});

	it('treats a root base as containing everything', () => {
		expect(under('/intro', '/')).toBe(true);
		expect(under('/', '/')).toBe(true);
	});
});

describe('firstSegmentUnder', () => {
	it('returns the segment directly below the base', () => {
		expect(firstSegmentUnder('/docs/v1/intro', '/docs')).toBe('v1');
		expect(firstSegmentUnder('/docs/v1', '/docs')).toBe('v1');
	});

	it('reads the first segment of the whole path against a root base', () => {
		expect(firstSegmentUnder('/docs/introduction', '/')).toBe('docs');
		expect(firstSegmentUnder('/theming', '')).toBe('theming');
	});

	it('stops at a query or fragment', () => {
		expect(firstSegmentUnder('/docs/v1#top', '/docs')).toBe('v1');
		expect(firstSegmentUnder('/docs/v1?q=x', '/docs')).toBe('v1');
	});

	it('is undefined when nothing follows the base', () => {
		expect(firstSegmentUnder('/docs', '/docs')).toBeUndefined();
		expect(firstSegmentUnder('/', '/')).toBeUndefined();
		expect(firstSegmentUnder('#anchor', '')).toBeUndefined();
	});

	it('is undefined when the url is not under the base', () => {
		expect(firstSegmentUnder('/docsmith/x', '/docs')).toBeUndefined();
		expect(firstSegmentUnder('https://x.dev', '/')).toBeUndefined();
	});
});

describe('sitePathOf', () => {
	it('keeps a site-absolute href, without its query or fragment', () => {
		expect(sitePathOf('/docs/intro', '/docs/setup')).toBe('/docs/intro');
		expect(sitePathOf('/docs/intro?tab=x#top', '/docs/setup')).toBe('/docs/intro');
		expect(sitePathOf('/docs/intro/', '/docs/setup')).toBe('/docs/intro/');
	});

	it('resolves a relative href against the page URL, as a browser does', () => {
		// Pages are served without a trailing slash, so `./x` is a sibling.
		expect(sitePathOf('./theming', '/docs/guide/setup')).toBe('/docs/guide/theming');
		expect(sitePathOf('../intro', '/docs/guide/setup')).toBe('/docs/intro');
		expect(sitePathOf('../../../../x', '/docs/guide/setup')).toBe('/x');
		expect(sitePathOf('./', '/docs/guide/setup')).toBe('/docs/guide/');
		expect(sitePathOf('./x?q=1#y', '/docs/intro')).toBe('/docs/x');
		expect(sitePathOf('./x', '/')).toBe('/x');
	});

	it('resolves dot segments in a site-absolute href too', () => {
		expect(sitePathOf('/docs/guide/../intro', '/')).toBe('/docs/intro');
		expect(sitePathOf('/docs/./intro', '/')).toBe('/docs/intro');
	});

	it('reads a same-page fragment as the page itself', () => {
		expect(sitePathOf('#versions', '/docs/intro')).toBe('/docs/intro');
	});

	it('never percent-encodes, so a path matches a directory named as written', () => {
		expect(sitePathOf('./café/x', '/docs/intro')).toBe('/docs/café/x');
		expect(sitePathOf('/docs/a b', '/')).toBe('/docs/a b');
	});

	it('decodes a percent-encoded segment, which names the same path to a browser', () => {
		// remark writes a markdown link's href encoded, a raw <a> keeps it as written.
		expect(sitePathOf('./caf%C3%A9/x', '/docs/intro')).toBe('/docs/café/x');
		expect(sitePathOf('/docs/a%20b', '/')).toBe('/docs/a b');
		// Never into a separator, and never failing on a stray `%`.
		expect(sitePathOf('/docs/a%2Fb', '/')).toBe('/docs/a%2Fb');
		expect(sitePathOf('/docs/100%', '/')).toBe('/docs/100%');
	});

	it('is undefined for another origin', () => {
		expect(sitePathOf('https://x.dev/docs', '/docs/intro')).toBeUndefined();
		expect(sitePathOf('mailto:a@x.dev', '/docs/intro')).toBeUndefined();
		expect(sitePathOf('//x.dev/docs', '/docs/intro')).toBeUndefined();
	});

	it('is undefined for a form it does not resolve: a bare relative path or a query alone', () => {
		expect(sitePathOf('theming', '/docs/intro')).toBeUndefined();
		expect(sitePathOf('?tab=x', '/docs/intro')).toBeUndefined();
	});

	it('is undefined for a relative href or fragment with no page URL to resolve against', () => {
		expect(sitePathOf('./x', undefined)).toBeUndefined();
		expect(sitePathOf('#x', undefined)).toBeUndefined();
		expect(sitePathOf('/docs/x', undefined)).toBe('/docs/x');
	});
});
