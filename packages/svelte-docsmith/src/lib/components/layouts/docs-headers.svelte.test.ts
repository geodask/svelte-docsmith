import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { resolveDocsPage, type DocsmithSite } from '#lib/core/index.js';

const site: DocsmithSite = vi.hoisted(() => ({
	title: 'My Docs',
	logo: '/logo.svg',
	nav: [
		{ label: 'Docs', href: '/docs/intro' },
		{ label: 'Blog', href: '/blog' }
	]
}));
vi.mock('svelte-docsmith/site', () => ({ site }));
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/docs/guide') } }));
// The mobile menu's scroll area measures itself; jsdom has no ResizeObserver.
vi.stubGlobal(
	'ResizeObserver',
	class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
);
import Harness from './_fixtures/headers-harness.svelte';

const input = {
	content: [
		{ title: 'Intro', path: '/docs/intro', section: 'Start', order: 1 },
		{ title: 'Guide', path: '/docs/guide', section: 'Start', order: 2 }
	],
	versions: [],
	pathname: '/docs/guide',
	site
};
const view = resolveDocsPage(input);

// Both headers render the one resolved view, so what the rules decide (which
// section is active, which logo) is covered in `core/docs-page.test.ts`; this
// pins that the desktop header and the mobile menu both show it.
describe('DocsHeader and DocsMobileHeader', () => {
	async function openMobileMenu() {
		await fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
		return screen.findByRole('dialog');
	}

	it('mark the same header link as the current section', async () => {
		render(Harness, { props: { view } });
		const desktop = within(screen.getByRole('navigation', { name: 'Main' }));
		expect(desktop.getByRole('link', { name: 'Docs' })).toHaveAttribute('aria-current', 'page');
		expect(desktop.getByRole('link', { name: 'Blog' })).not.toHaveAttribute('aria-current');

		const menu = within(await openMobileMenu());
		const mobile = within(menu.getByRole('navigation', { name: 'Main' }));
		expect(mobile.getByRole('link', { name: 'Docs' })).toHaveAttribute('aria-current', 'page');
		expect(mobile.getByRole('link', { name: 'Blog' })).not.toHaveAttribute('aria-current');
	});

	it('both show site.logo', async () => {
		const { container } = render(Harness, { props: { view } });
		expect(container.querySelector('header img')).toHaveAttribute('src', '/logo.svg');

		const menu = await openMobileMenu();
		expect(menu.querySelector('img')).toHaveAttribute('src', '/logo.svg');
	});

	it('render two header links that share an href', async () => {
		const nav = [
			{ label: 'Docs', href: '/docs/intro' },
			{ label: 'Guide', href: '/docs/intro' }
		];
		render(Harness, {
			props: { view: resolveDocsPage({ ...input, site: { ...site, nav } }) }
		});
		const desktop = within(screen.getByRole('navigation', { name: 'Main' }));
		expect(desktop.getByRole('link', { name: 'Guide' })).toHaveAttribute('href', '/docs/intro');

		const menu = within(await openMobileMenu());
		const mobile = within(menu.getByRole('navigation', { name: 'Main' }));
		expect(mobile.getByRole('link', { name: 'Guide' })).toHaveAttribute('href', '/docs/intro');
	});

	it('show the page title in the mobile bar and the sidebar in its menu', async () => {
		render(Harness, { props: { view } });
		expect(screen.getByText('Guide', { selector: 'div' })).toBeInTheDocument();

		const menu = within(await openMobileMenu());
		expect(menu.getByRole('navigation', { name: 'Documentation' })).toBeInTheDocument();
	});
});
