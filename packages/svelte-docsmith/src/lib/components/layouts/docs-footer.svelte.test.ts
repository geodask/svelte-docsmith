import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import type { DocsmithSite } from '#lib/core/index.js';

const site: DocsmithSite = vi.hoisted(() => ({
	title: 'My Docs',
	footer: {
		copyright: '© Me',
		columns: [
			{
				title: 'Project',
				links: [
					{ label: 'Repo', href: 'https://github.com/o/r', external: true },
					{ label: 'Source', href: 'https://github.com/o/r', external: true }
				]
			},
			{
				title: 'Project',
				links: [
					{ label: 'Docs', href: '/docs' },
					{ label: 'API', href: '/relative/api' },
					{ label: 'Relatives', href: '/relatives' }
				]
			}
		]
	}
}));
// `/relative` is an outside path: served by something other than this app.
vi.mock('svelte-docsmith/site', async () =>
	(await import('#lib/fallbacks/_fixtures/site-module.js')).siteModule({
		site,
		outside: ['/relative']
	})
);
import DocsFooter from './docs-footer.svelte';

describe('DocsFooter', () => {
	it('renders site.footer', () => {
		render(DocsFooter);
		const footer = within(screen.getByRole('contentinfo'));
		expect(footer.getByText('© Me')).toBeInTheDocument();
		expect(footer.getByRole('link', { name: /Powered by/ })).toBeInTheDocument();
	});

	// Config lists are hand-written, so a repeated href or column title is
	// plausible and must not crash the render.
	it('renders links that share an href and columns that share a title', () => {
		render(DocsFooter);
		expect(screen.getByRole('link', { name: 'Repo' })).toHaveAttribute(
			'href',
			'https://github.com/o/r'
		);
		expect(screen.getByRole('link', { name: 'Source' })).toHaveAttribute(
			'href',
			'https://github.com/o/r'
		);
		expect(screen.getAllByText('Project')).toHaveLength(2);
	});

	// Kit's crawler skips a `rel="external"` link, so a footer link to an
	// outside path can't fail the build.
	it('marks column links under an outside path rel="external", and only those', () => {
		render(DocsFooter);
		expect(screen.getByRole('link', { name: 'API' })).toHaveAttribute('rel', 'external');
		expect(screen.getByRole('link', { name: 'Relatives' })).not.toHaveAttribute('rel');
		expect(screen.getByRole('link', { name: 'Docs' })).not.toHaveAttribute('rel');
		expect(screen.getByRole('link', { name: 'Repo' })).toHaveAttribute(
			'rel',
			'noopener noreferrer'
		);
	});
});
