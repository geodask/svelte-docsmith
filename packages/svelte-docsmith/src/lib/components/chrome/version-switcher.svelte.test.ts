import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { VersionLink } from '$lib/core/index.js';
import VersionSwitcher from './version-switcher.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
import { goto } from '$app/navigation';

// As `resolveDocsPage` emits them: current first (unprefixed at the docs root),
// then archives, each already pointing at this page in that version.
const links: VersionLink[] = [
	{ id: 'v2', label: 'v2', href: '/docs/intro', active: true },
	{ id: 'v1', label: 'v1', href: '/docs/v1/intro', active: false }
];

describe('VersionSwitcher', () => {
	beforeEach(() => vi.clearAllMocks());

	it('shows the active version label', () => {
		render(VersionSwitcher, { props: { links } });
		expect(screen.getByRole('button', { name: /v2/ })).toBeInTheDocument();
	});

	it('lists every version when opened', async () => {
		render(VersionSwitcher, { props: { links } });
		await fireEvent.click(screen.getByRole('button'));
		expect(await screen.findByRole('menuitem', { name: 'v1' })).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'v2' })).toBeInTheDocument();
	});

	it('navigates to the destination the chosen version was given', async () => {
		render(VersionSwitcher, { props: { links } });
		await fireEvent.click(screen.getByRole('button'));
		await fireEvent.click(await screen.findByRole('menuitem', { name: 'v1' }));
		expect(goto).toHaveBeenCalledWith('/docs/v1/intro');
	});

	it('stays put when the version already being read is picked', async () => {
		render(VersionSwitcher, { props: { links } });
		await fireEvent.click(screen.getByRole('button'));
		await fireEvent.click(await screen.findByRole('menuitem', { name: 'v2' }));
		expect(goto).not.toHaveBeenCalled();
	});
});
