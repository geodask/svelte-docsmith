import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Shiki's markup arrives through `{@html}`, so this component's styles cannot be
 * scoped by Svelte and have to be `:global`. That makes them a standing hazard:
 * a selector anchored on the bare `pre` element restyles every code block in the
 * consuming app, including ones rendered by other components.
 *
 * That is not a cosmetic problem. A component's CSS ships with the route that
 * imports it, so it lands whenever that route is loaded, and SvelteKit preloads
 * routes on link hover. A leaked rule therefore repaints unrelated code blocks
 * part-way through a session and shifts the layout under the user's pointer.
 *
 * These assert the anchor rather than any particular declaration, so the styles
 * stay free to change.
 */
const source = readFileSync(fileURLToPath(new URL('./pre.svelte', import.meta.url)), 'utf8');
const styles = source.slice(source.indexOf('<style>'), source.lastIndexOf('</style>'));
const globalSelectors = [...styles.matchAll(/:global\(([^)]*)\)/g)].map((match) => match[1]);

describe('pre.svelte global styles', () => {
	it('marks its own <pre> so the global rules have something to anchor on', () => {
		expect(source).toMatch(/<pre\b[^>]*class="[^"]*\bdocsmith-code\b/);
	});

	it('has global rules to check', () => {
		expect(globalSelectors.length).toBeGreaterThan(0);
	});

	it('anchors every global rule on pre.docsmith-code, never the bare element', () => {
		const leaked = globalSelectors.filter((selector) =>
			/(^|[\s>+~])pre(?!\.docsmith-code)/.test(selector)
		);
		expect(leaked).toEqual([]);
	});
});
