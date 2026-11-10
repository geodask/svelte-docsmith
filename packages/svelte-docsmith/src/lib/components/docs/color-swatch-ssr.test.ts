import { describe, expect, it } from 'vitest';
import { render as renderToString } from 'svelte/server';
import ColorSwatch from './color-swatch.svelte';

// Runs in the node project, where Svelte compiles for the server: the server
// can't know what a variable resolves to, so it writes the value as given.
describe('ColorSwatch on the server', () => {
	it('shows the value as written', () => {
		const { body } = renderToString(ColorSwatch, { props: { value: 'var(--brand)' } });
		expect(body).toContain('--docsmith-swatch: var(--brand)');
		expect(body).toMatch(/<code[^>]*>var\(--brand\)<\/code>/);
		expect(body).toContain('>--brand</span>');
	});
});
