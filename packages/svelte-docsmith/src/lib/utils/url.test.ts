import { describe, expect, it } from 'vitest';
import { firstSegmentUnder, join, normalizePath, under } from './url.js';

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
