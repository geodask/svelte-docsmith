import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Fixture from './_fixtures/tabs-basic.svelte';

// SSR selection (the three-phase guarantee) is covered in tabs-ssr.test.ts,
// which runs in the node project where components compile in SSR mode. Here we
// exercise the hydrated, interactive behaviour.

describe('Tabs — client behaviour', () => {
	it('exposes the ARIA tab pattern (tablist / tabs / panel)', () => {
		render(Fixture);
		expect(screen.getByRole('tablist')).toBeInTheDocument();
		expect(screen.getAllByRole('tab')).toHaveLength(3);
		expect(screen.getByRole('tabpanel')).toBeInTheDocument();
	});

	it('selects the first tab by default', () => {
		render(Fixture);
		const [npm, pnpm, yarn] = screen.getAllByRole('tab');
		expect(npm).toHaveAttribute('aria-selected', 'true');
		expect(pnpm).toHaveAttribute('aria-selected', 'false');
		expect(yarn).toHaveAttribute('aria-selected', 'false');
		expect(screen.getByText('npm content')).toBeVisible();
	});

	it('switches the visible panel when another tab is activated', async () => {
		render(Fixture);
		expect(screen.getByText('npm content')).toBeVisible();

		await fireEvent.click(screen.getByRole('tab', { name: 'pnpm' }));
		// findBy retries: the panel swap goes through bits-ui's async state, so
		// asserting synchronously right after the click would be racy.
		expect(await screen.findByText('pnpm content')).toBeVisible();
	});
});

describe('Tabs — synced selection', () => {
	// A minimal Storage; jsdom's own is incomplete for the sync store (mirrors the
	// approach in tabs-sync.svelte.test.ts).
	function createStorage(): Storage {
		const map = new Map<string, string>();
		return {
			get length() {
				return map.size;
			},
			clear: () => map.clear(),
			getItem: (key) => (map.has(key) ? map.get(key)! : null),
			setItem: (key, value) => void map.set(key, String(value)),
			removeItem: (key) => void map.delete(key),
			key: (index) => [...map.keys()][index] ?? null
		};
	}

	beforeEach(() => vi.stubGlobal('localStorage', createStorage()));
	afterEach(() => vi.unstubAllGlobals());

	it('persists a selection under the sync key', async () => {
		render(Fixture, { props: { syncKey: 'tabs-test-persist' } });

		await fireEvent.click(screen.getByRole('tab', { name: 'yarn' }));
		// Persistence is gated on a mount `$effect` flipping `ready`, so poll for
		// the write rather than reading it on the next tick.
		await vi.waitFor(() =>
			expect(localStorage.getItem('docsmith-tabs:tabs-test-persist')).toBe('yarn')
		);
	});
});
