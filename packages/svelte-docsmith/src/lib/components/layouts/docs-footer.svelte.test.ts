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
			{ title: 'Project', links: [{ label: 'Docs', href: '/docs' }] }
		]
	}
}));
vi.mock('svelte-docsmith/site', () => ({ site }));
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
});
