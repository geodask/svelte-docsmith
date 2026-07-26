import { describe, expect, it } from 'vitest';
import { render as renderToString } from 'svelte/server';
import Fixture from './_fixtures/tabs-basic.svelte';

// This file runs in the node project (no `.svelte` in the name), where Svelte
// compiles in SSR mode — so `svelte/server` render works and client-only
// `$effect`s are absent. That's exactly the environment the three-phase design
// targets: the correct panel must be selected in the server HTML with no effects
// and no hydration, so there's no flash of the wrong tab on first paint.

// The active trigger is the `role="tab"` button carrying aria-selected="true";
// its text content is the tab label. Parsed from the string to avoid pulling a
// DOM implementation into the node test.
function selectedTab(body: string): string | undefined {
	for (const [, attrs, inner] of body.matchAll(
		/<button\b([^>]*\brole="tab"[^>]*)>([\s\S]*?)<\/button>/g
	)) {
		if (/\baria-selected="true"/.test(attrs)) return inner.replace(/<[^>]*>/g, '').trim();
	}
	return undefined;
}

describe('Tabs — server render (three-phase selection)', () => {
	it('selects the first tab by default in the server HTML', () => {
		const { body } = renderToString(Fixture, { props: {} });
		expect(selectedTab(body)).toBe('npm');
		expect(body).toContain('npm content');
	});

	it('honours an explicit default value in the server HTML', () => {
		const { body } = renderToString(Fixture, { props: { value: 'pnpm' } });
		expect(selectedTab(body)).toBe('pnpm');
		expect(body).toContain('pnpm content');
	});
});
