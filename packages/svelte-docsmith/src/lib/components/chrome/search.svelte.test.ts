import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { SearchDoc } from '$lib/core/index.js';
import Harness from './_fixtures/search-harness.svelte';

// goto would try to drive the (absent) SvelteKit router; stub it so we can assert
// navigation without one.
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
import { goto } from '$app/navigation';

const docs: SearchDoc[] = [
	{
		path: '/docs/introduction',
		title: 'Introduction',
		section: 'Guide',
		description: 'Getting started',
		headings: ['Welcome'],
		text: 'Install the package and configure the preprocessor.'
	},
	{
		path: '/docs/theming',
		title: 'Theming',
		section: 'Guide',
		description: 'Theme tokens',
		headings: ['Presets'],
		text: 'Swap themes with a single css import and override the tokens.'
	}
];

const PLACEHOLDER = 'Search documentation...';

describe('Search palette', () => {
	// Activating a result is a real <a href>; with no SvelteKit router in jsdom the
	// anchor's default would log "Not implemented: navigation". The app navigates
	// via the mocked goto, so cancel the anchor default (handlers still run).
	const cancelAnchorNav = (event: Event) => {
		if ((event.target as HTMLElement)?.closest?.('a[href]')) event.preventDefault();
	};

	beforeEach(() => {
		vi.clearAllMocks();
		document.addEventListener('click', cancelAnchorNav, true);
	});
	afterEach(() => {
		document.removeEventListener('click', cancelAnchorNav, true);
		vi.restoreAllMocks();
	});

	it('stays closed until opened, then toggles on ⌘K / Ctrl+K', async () => {
		render(Harness, { props: { load: () => Promise.resolve(docs) } });
		expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();

		await fireEvent.keyDown(window, { key: 'k', metaKey: true });
		expect(await screen.findByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();

		// Pressing again closes it.
		await fireEvent.keyDown(window, { key: 'k', metaKey: true });
		await vi.waitFor(() =>
			expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument()
		);
	});

	it('loads the index lazily — never before opening, and only once', async () => {
		const load = vi.fn(() => Promise.resolve(docs));
		render(Harness, { props: { load } });

		expect(load).not.toHaveBeenCalled(); // index is code-split, not eager

		await fireEvent.click(screen.getByTestId('open-search'));
		await screen.findByPlaceholderText(PLACEHOLDER);
		await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));

		// Close and reopen: the engine is cached, so no second fetch.
		await fireEvent.keyDown(window, { key: 'k', metaKey: true }); // close
		await fireEvent.click(screen.getByTestId('open-search')); // reopen
		await screen.findByPlaceholderText(PLACEHOLDER);
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('shows engine results for a query and opens the picked page', async () => {
		render(Harness, { props: { load: () => Promise.resolve(docs) } });

		await fireEvent.click(screen.getByTestId('open-search'));
		const input = await screen.findByPlaceholderText(PLACEHOLDER);

		await fireEvent.input(input, { target: { value: 'theming' } });

		// findBy retries while the engine finishes loading and the query resolves.
		await screen.findByText('Theming');
		expect(screen.queryByText('Introduction')).not.toBeInTheDocument();

		// Pick it the way a reader does — keyboard-first — which also avoids a real
		// anchor navigation in jsdom.
		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		await fireEvent.keyDown(input, { key: 'Enter' });
		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/docs/theming'));
		await vi.waitFor(() =>
			expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument()
		);
	});

	it('reports when a query matches nothing', async () => {
		render(Harness, { props: { load: () => Promise.resolve(docs) } });

		await fireEvent.click(screen.getByTestId('open-search'));
		const input = await screen.findByPlaceholderText(PLACEHOLDER);
		await fireEvent.input(input, { target: { value: 'zzzznomatch' } });

		expect(await screen.findByText(/no results/i)).toBeInTheDocument();
	});
});
