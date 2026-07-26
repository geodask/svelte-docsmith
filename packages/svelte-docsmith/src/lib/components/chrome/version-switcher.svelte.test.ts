import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { ResolvedVersion, DocsContentItem } from '$lib/core/index.js';
import VersionSwitcher from './version-switcher.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
import { goto } from '$app/navigation';

// Current first (unprefixed at the docs root), then archives.
const versions: ResolvedVersion[] = [
	{
		id: 'v2',
		label: 'v2',
		current: true,
		basePath: '/docs',
		landing: '/docs/intro',
		noindex: false
	},
	{
		id: 'v1',
		label: 'v1',
		current: false,
		basePath: '/docs/v1',
		landing: '/docs/v1/intro',
		noindex: false
	}
];
const content: DocsContentItem[] = [
	{ title: 'Intro', path: '/docs/intro', version: 'v2' },
	{ title: 'Guide', path: '/docs/guide', version: 'v2' },
	{ title: 'Intro', path: '/docs/v1/intro', version: 'v1' }
];
const active = versions[0];

describe('VersionSwitcher', () => {
	beforeEach(() => vi.clearAllMocks());

	it('shows the active version label', () => {
		render(VersionSwitcher, { props: { versions, active, content, pathname: '/docs/intro' } });
		expect(screen.getByRole('button', { name: /v2/ })).toBeInTheDocument();
	});

	it('lists every version when opened', async () => {
		render(VersionSwitcher, { props: { versions, active, content, pathname: '/docs/intro' } });
		await fireEvent.click(screen.getByRole('button'));
		expect(await screen.findByRole('menuitem', { name: 'v1' })).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'v2' })).toBeInTheDocument();
	});

	it('navigates to the same page in the chosen version when it exists there', async () => {
		render(VersionSwitcher, { props: { versions, active, content, pathname: '/docs/intro' } });
		await fireEvent.click(screen.getByRole('button'));
		await fireEvent.click(await screen.findByRole('menuitem', { name: 'v1' }));
		expect(goto).toHaveBeenCalledWith('/docs/v1/intro');
	});

	it("falls back to the target's landing when the current page is missing there", async () => {
		render(VersionSwitcher, { props: { versions, active, content, pathname: '/docs/guide' } });
		await fireEvent.click(screen.getByRole('button'));
		await fireEvent.click(await screen.findByRole('menuitem', { name: 'v1' }));
		// v1 has no "guide" page, so land on v1's first page.
		expect(goto).toHaveBeenCalledWith('/docs/v1/intro');
	});

	it('navigates back to the unprefixed current version from an archive', async () => {
		render(VersionSwitcher, {
			props: { versions, active: versions[1], content, pathname: '/docs/v1/intro' }
		});
		await fireEvent.click(screen.getByRole('button'));
		await fireEvent.click(await screen.findByRole('menuitem', { name: 'v2' }));
		expect(goto).toHaveBeenCalledWith('/docs/intro');
	});
});
