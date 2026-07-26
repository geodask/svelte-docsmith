import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { ResolvedVersion, DocsContentItem } from '$lib/core/index.js';
import VersionSwitcher from './version-switcher.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
import { goto } from '$app/navigation';

const versions: ResolvedVersion[] = [
	{
		id: 'v2',
		label: 'v2 (latest)',
		path: 'v2',
		latest: true,
		basePath: '/docs/v2',
		landing: '/docs/v2/intro',
		noindex: false
	},
	{
		id: 'v1',
		label: 'v1',
		path: 'v1',
		basePath: '/docs/v1',
		landing: '/docs/v1/intro',
		noindex: false
	}
];
const content: DocsContentItem[] = [
	{ title: 'Intro', path: '/docs/v2/intro', version: 'v2' },
	{ title: 'Guide', path: '/docs/v2/guide', version: 'v2' },
	{ title: 'Intro', path: '/docs/v1/intro', version: 'v1' }
];
const active = versions[0];

describe('VersionSwitcher', () => {
	beforeEach(() => vi.clearAllMocks());

	it('shows the active version label', () => {
		render(VersionSwitcher, { props: { versions, active, content, pathname: '/docs/v2/intro' } });
		expect(screen.getByRole('button', { name: /v2 \(latest\)/ })).toBeInTheDocument();
	});

	it('lists every version when opened', async () => {
		render(VersionSwitcher, { props: { versions, active, content, pathname: '/docs/v2/intro' } });
		await fireEvent.click(screen.getByRole('button'));
		expect(await screen.findByRole('menuitem', { name: 'v1' })).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'v2 (latest)' })).toBeInTheDocument();
	});

	it('navigates to the same page in the chosen version when it exists there', async () => {
		render(VersionSwitcher, { props: { versions, active, content, pathname: '/docs/v2/intro' } });
		await fireEvent.click(screen.getByRole('button'));
		await fireEvent.click(await screen.findByRole('menuitem', { name: 'v1' }));
		expect(goto).toHaveBeenCalledWith('/docs/v1/intro');
	});

	it("falls back to the target's landing when the current page is missing there", async () => {
		render(VersionSwitcher, { props: { versions, active, content, pathname: '/docs/v2/guide' } });
		await fireEvent.click(screen.getByRole('button'));
		await fireEvent.click(await screen.findByRole('menuitem', { name: 'v1' }));
		// v1 has no "guide" page, so land on v1's first page.
		expect(goto).toHaveBeenCalledWith('/docs/v1/intro');
	});
});
