import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { ResolvedVersion } from '$lib/core/index.js';
import VersionBanner from './version-banner.svelte';

// The current version is unprefixed at the docs root; only archives carry a
// prefix. See docs/adr/0001-unprefixed-current-docs.md.
const current: ResolvedVersion = {
	id: 'v2',
	label: 'v2',
	current: true,
	basePath: '/docs',
	landing: '/docs/intro',
	noindex: false
};
const archived: ResolvedVersion = {
	id: 'v1',
	label: 'v1',
	current: false,
	basePath: '/docs/v1',
	landing: '/docs/v1/intro',
	noindex: false
};

describe('VersionBanner', () => {
	it('warns on an archived version and links to the same page in current', () => {
		render(VersionBanner, { props: { active: archived, current, href: '/docs/intro' } });
		expect(screen.getByRole('note')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /view this page in v2/i })).toHaveAttribute(
			'href',
			'/docs/intro'
		);
	});
});
