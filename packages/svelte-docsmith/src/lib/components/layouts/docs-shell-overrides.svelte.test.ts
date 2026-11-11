import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import type { DocsContentItem } from '#lib/core/index.js';

// The shell needs a router and the served site config; jsdom has neither.
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/docs/guide') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), afterNavigate: vi.fn() }));
vi.mock('svelte-docsmith/site', () => ({
	site: { title: 'My Docs' },
	outside: [],
	githubStars: undefined
}));
// mode-watcher reads localStorage as it loads, and the mobile menu's scroll
// area measures itself: stub both before the imports.
vi.hoisted(() => {
	const map = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		get length() {
			return map.size;
		},
		clear: () => map.clear(),
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => void map.set(key, String(value)),
		removeItem: (key: string) => void map.delete(key),
		key: (index: number) => [...map.keys()][index] ?? null
	} satisfies Storage);
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	);
});

import Harness from './_fixtures/shell-overrides-harness.svelte';

const content: DocsContentItem[] = [
	{ title: 'Intro', path: '/docs/intro', section: 'Start', order: 1 },
	{
		title: 'Guide',
		path: '/docs/guide',
		section: 'Start',
		order: 2,
		readingTime: 4,
		toc: [
			{ id: 'install', title: 'Install', depth: 2 },
			{ id: 'configure', title: 'Configure', depth: 3 }
		]
	},
	{ title: 'Deploy', path: '/docs/deploy', section: 'Start', order: 3 }
];

async function openMobileMenu() {
	await fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
	return within(await screen.findByRole('dialog'));
}

describe('DocsShell overrides', () => {
	it('renders the built-in parts when nothing is overridden', () => {
		render(Harness, { props: { content } });
		expect(screen.getByRole('navigation', { name: 'Documentation' })).toBeInTheDocument();
		expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
		expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
		expect(screen.getByText('4 min read')).toBeInTheDocument();
		const pager = within(screen.getByRole('navigation', { name: 'Pagination' }));
		expect(pager.getByRole('link', { name: /Intro/ })).toHaveAttribute('href', '/docs/intro');
		expect(pager.getByRole('link', { name: /Deploy/ })).toHaveAttribute('href', '/docs/deploy');
	});

	it("shows the page's since in the page header", () => {
		const withSince = content.map((item) =>
			item.path === '/docs/guide' ? { ...item, since: '0.15' } : item
		);
		render(Harness, { props: { content: withSince } });
		expect(screen.getByText('Since 0.15')).toBeInTheDocument();
	});

	it('replaces the sidebar, on the page and in the mobile menu', async () => {
		render(Harness, { props: { content, overrides: ['sidebar'] } });
		expect(screen.queryByRole('navigation', { name: 'Documentation' })).not.toBeInTheDocument();
		expect(screen.getByTestId('sidebar-override')).toHaveTextContent('Start');

		const menu = await openMobileMenu();
		expect(menu.getByTestId('sidebar-override')).toHaveTextContent('Start');
		expect(menu.queryByRole('navigation', { name: 'Documentation' })).not.toBeInTheDocument();
	});

	it('lets an override wrap the built-in sidebar with the props it was given', () => {
		render(Harness, { props: { content, overrides: ['wrapSidebar'] } });
		expect(screen.getByTestId('sidebar-banner')).toBeInTheDocument();
		const nav = within(screen.getByRole('navigation', { name: 'Documentation' }));
		expect(nav.getByRole('link', { name: 'Guide' })).toHaveAttribute('aria-current', 'page');
	});

	it('replaces the table of contents, on the page and in the mobile popover', async () => {
		render(Harness, { props: { content, overrides: ['toc'] } });
		expect(screen.queryByRole('navigation', { name: 'On this page' })).not.toBeInTheDocument();
		expect(screen.getByTestId('toc-override')).toHaveTextContent('install,configure|');

		await fireEvent.click(screen.getByRole('button', { name: 'On this page' }));
		expect(await screen.findAllByTestId('toc-override')).toHaveLength(2);
	});

	it('replaces the page header, passing the path, trail, reading time and Copy page', () => {
		render(Harness, { props: { content, overrides: ['pageHeader'], copyPage: true } });
		expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
		expect(screen.queryByText('4 min read')).not.toBeInTheDocument();
		expect(screen.getByTestId('page-header-override')).toHaveTextContent(
			'/docs/guide|Start>Guide|4|true'
		);
	});

	it('leaves reading time out of the page header when readingTime is off', () => {
		render(Harness, { props: { content, overrides: ['pageHeader'], readingTime: false } });
		expect(screen.getByTestId('page-header-override')).toHaveTextContent(
			'/docs/guide|Start>Guide||false'
		);
	});

	it('replaces the pager', () => {
		render(Harness, { props: { content, overrides: ['pager'] } });
		expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
		expect(screen.getByTestId('pager-override')).toHaveTextContent('Intro|Deploy');
	});

	it('ignores every override on the page layout', () => {
		render(Harness, {
			props: { content, layout: 'page', overrides: ['sidebar', 'toc', 'pageHeader', 'pager'] }
		});
		for (const id of [
			'sidebar-override',
			'toc-override',
			'page-header-override',
			'pager-override'
		]) {
			expect(screen.queryByTestId(id)).not.toBeInTheDocument();
		}
	});
});
