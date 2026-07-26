import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { NavGroup } from '$lib/core/index.js';

// The sidebar reads the active route from $app/state; a plain page stand-in is
// enough since we render one fixed location per test.
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/docs/theming') } }));
import DocsSidebar from './docs-sidebar.svelte';

const nav: NavGroup[] = [
	{
		title: 'Guide',
		items: [
			{ title: 'Introduction', url: '/docs/introduction' },
			{ title: 'Advanced', items: [{ title: 'Theming', url: '/docs/theming' }] },
			{ title: 'Other', items: [{ title: 'Misc', url: '/docs/misc' }] }
		]
	}
];

function detailsBySummary(container: HTMLElement, text: string) {
	return [...container.querySelectorAll('details')].find((d) =>
		d.querySelector('summary')?.textContent?.includes(text)
	);
}

describe('DocsSidebar', () => {
	it('labels its navigation landmark and renders group headings', () => {
		render(DocsSidebar, { props: { nav } });
		expect(screen.getByRole('navigation', { name: 'Documentation' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Guide' })).toBeInTheDocument();
	});

	it('marks only the current page with aria-current', () => {
		render(DocsSidebar, { props: { nav } });
		expect(screen.getByRole('link', { name: 'Theming' })).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: 'Introduction' })).not.toHaveAttribute('aria-current');
	});

	it('opens the group holding the current page and leaves siblings collapsed', () => {
		const { container } = render(DocsSidebar, { props: { nav } });
		expect(detailsBySummary(container, 'Advanced')?.open).toBe(true);
		expect(detailsBySummary(container, 'Other')?.open).toBe(false);
	});
});
