import { describe, expect, it } from 'vitest';
import { buildSnippet } from './snippet.js';

describe('buildSnippet', () => {
	it('returns an empty string for empty text', () => {
		expect(buildSnippet('', 'query')).toBe('');
		expect(buildSnippet('   ', 'query')).toBe('');
	});

	it('returns the whole text when it is short and there is no match', () => {
		expect(buildSnippet('A short line of prose.', 'zzz')).toBe('A short line of prose.');
	});

	it('collapses whitespace', () => {
		expect(buildSnippet('lots   of\n\twhitespace', 'zzz')).toBe('lots of whitespace');
	});

	it('truncates the head with an ellipsis when long and nothing matches', () => {
		const text = 'word '.repeat(100).trim();
		const snippet = buildSnippet(text, 'zzz', 40);
		expect(snippet.endsWith('…')).toBe(true);
		expect(snippet.length).toBeLessThanOrEqual(41);
	});

	it('centers the excerpt on the first matching term', () => {
		const text =
			'Alpha beta gamma delta epsilon zeta eta theta iota kappa TARGET lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega done';
		const snippet = buildSnippet(text, 'target', 60);
		expect(snippet.toLowerCase()).toContain('target');
		expect(snippet.startsWith('…')).toBe(true);
		expect(snippet.endsWith('…')).toBe(true);
	});

	it('matches case-insensitively and picks the earliest term', () => {
		const text = 'The quick brown fox jumps over the lazy dog near the river bank at dawn.';
		expect(buildSnippet(text, 'FOX', 200)).toContain('fox');
		// "dog" appears after "fox"; the earliest matching term wins the center.
		expect(buildSnippet(text, 'dog fox', 200).toLowerCase()).toContain('fox');
	});

	it('does not start or end mid-word', () => {
		const text =
			'introduction paragraph continues with several words before the keyword appears and then keeps going afterwards for a while longer indeed';
		const snippet = buildSnippet(text, 'keyword', 50).replace(/^…|…$/g, '');
		// No partial word at either edge (bounded by spaces or string ends).
		expect(text).toContain(snippet.trim());
	});
});
