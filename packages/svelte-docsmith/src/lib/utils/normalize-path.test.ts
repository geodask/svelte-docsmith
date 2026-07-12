import { describe, expect, it } from 'vitest';
import { normalizePath } from './normalize-path.js';

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
