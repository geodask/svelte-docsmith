import { describe, expect, it } from 'vitest';
import { isOutsidePath } from './outside-path.js';

describe('isOutsidePath', () => {
	it('matches the prefix itself and paths beneath it', () => {
		expect(isOutsidePath('/relative', ['/relative'])).toBe(true);
		expect(isOutsidePath('/relative/x', ['/relative'])).toBe(true);
		expect(isOutsidePath('/relative/x/y', ['/relative'])).toBe(true);
	});

	it('matches on whole segments, so a prefix never captures a neighbour', () => {
		expect(isOutsidePath('/relatives', ['/relative'])).toBe(false);
		expect(isOutsidePath('/relative-x', ['/relative'])).toBe(false);
	});

	it('reads an href with a trailing slash, query or fragment', () => {
		expect(isOutsidePath('/relative/', ['/relative'])).toBe(true);
		expect(isOutsidePath('/relative?x=1', ['/relative'])).toBe(true);
		expect(isOutsidePath('/relative#top', ['/relative'])).toBe(true);
	});

	it('matches any of several prefixes, and nothing when there are none', () => {
		expect(isOutsidePath('/api/v1', ['/relative', '/api'])).toBe(true);
		expect(isOutsidePath('/docs/intro', ['/relative', '/api'])).toBe(false);
		expect(isOutsidePath('/relative', [])).toBe(false);
	});

	it('never matches a path that is not site-absolute', () => {
		expect(isOutsidePath('relative/x', ['/relative'])).toBe(false);
		expect(isOutsidePath('https://x.dev/relative', ['/relative'])).toBe(false);
	});
});
