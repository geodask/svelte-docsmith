import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { ResolvedVersion, DocsContentItem } from '$lib/core/index.js';
import VersionBanner from './version-banner.svelte';

const latest: ResolvedVersion = {
	id: 'v2',
	label: 'v2 (latest)',
	path: 'v2',
	latest: true,
	basePath: '/docs/v2',
	landing: '/docs/v2/intro',
	noindex: false
};
const archived: ResolvedVersion = {
	id: 'v1',
	label: 'v1',
	path: 'v1',
	basePath: '/docs/v1',
	landing: '/docs/v1/intro',
	noindex: false
};
const next: ResolvedVersion = {
	id: 'next',
	label: 'v3 (next)',
	path: 'next',
	prerelease: true,
	basePath: '/docs/next',
	landing: '/docs/next/intro',
	noindex: true
};
const content: DocsContentItem[] = [
	{ title: 'Intro', path: '/docs/v2/intro', version: 'v2' },
	{ title: 'Intro', path: '/docs/v1/intro', version: 'v1' }
];

describe('VersionBanner', () => {
	it('warns on an archived version and links to the same page in latest', () => {
		render(VersionBanner, {
			props: { active: archived, latest, pathname: '/docs/v1/intro', content }
		});
		expect(screen.getByRole('note')).toBeInTheDocument();
		const link = screen.getByRole('link', { name: /view this page in v2/i });
		expect(link).toHaveAttribute('href', '/docs/v2/intro');
	});

	it('falls back to latest landing when the page has no equivalent there', () => {
		render(VersionBanner, {
			props: { active: archived, latest, pathname: '/docs/v1/removed', content }
		});
		expect(screen.getByRole('link', { name: /view this page in v2/i })).toHaveAttribute(
			'href',
			'/docs/v2/intro'
		);
	});

	it('shows an unreleased notice for a prerelease version', () => {
		render(VersionBanner, {
			props: { active: next, latest, pathname: '/docs/next/intro', content }
		});
		expect(screen.getByText(/unreleased/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /latest stable/i })).toBeInTheDocument();
	});
});
