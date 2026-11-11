import { afterEach, describe, expect, it, vi } from 'vitest';
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
// The count the plugin fetched at build time; each test sets it before rendering.
const stars = vi.hoisted(() => ({ count: undefined as number | undefined }));
// `/relative` is an outside path: served by something other than this app.
vi.mock('svelte-docsmith/site', async () => {
	const { siteModule } = await import('#lib/fallbacks/_fixtures/site-module.js');
	return Object.defineProperty(siteModule({ site, outside: ['/relative'] }), 'githubStars', {
		get: () => stars.count,
		enumerable: true
	});
});
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

	// Kit's crawler skips a `rel="external"` link and the client router does a
	// full page load on it, so a header link to an outside path can't fail the
	// build and reaches whatever serves it.
	it('mark header links under an outside path rel="external", and only those', async () => {
		const nav = [
			{ label: 'API', href: '/relative/api' },
			{ label: 'Relatives', href: '/relatives' },
			{ label: 'Docs', href: '/docs/intro' },
			{ label: 'Repo', href: 'https://github.com/o/r', external: true },
			{ label: 'Proxied repo', href: '/relative/repo', external: true }
		];
		render(Harness, {
			props: { view: resolveDocsPage({ ...input, site: { ...site, nav } }) }
		});
		const desktop = within(screen.getByRole('navigation', { name: 'Main' }));
		const menu = within(await openMobileMenu());
		const mobile = within(menu.getByRole('navigation', { name: 'Main' }));

		for (const header of [desktop, mobile]) {
			expect(header.getByRole('link', { name: 'API' })).toHaveAttribute('rel', 'external');
			expect(header.getByRole('link', { name: 'Relatives' })).not.toHaveAttribute('rel');
			expect(header.getByRole('link', { name: 'Docs' })).not.toHaveAttribute('rel');
			expect(header.getByRole('link', { name: 'Repo' })).toHaveAttribute(
				'rel',
				'noopener noreferrer'
			);
			// `external: true` still opens a new tab; the outside path adds to it.
			expect(header.getByRole('link', { name: 'Proxied repo' })).toHaveAttribute(
				'rel',
				'external noopener noreferrer'
			);
		}
	});

	describe('GitHub link', () => {
		afterEach(() => {
			delete site.github;
			delete site.githubStars;
			stars.count = undefined;
			vi.unstubAllGlobals();
		});

		it('both show the star count the build fetched, compact, with the exact count in the name', () => {
			const fetch = vi.fn();
			vi.stubGlobal('fetch', fetch);
			site.github = 'https://github.com/o/built';
			stars.count = 1234;
			render(Harness, { props: { view } });
			const links = screen.getAllByRole('link', { name: 'GitHub, 1,234 stars' });
			expect(links).toHaveLength(2);
			for (const link of links) {
				expect(link).toHaveAttribute('href', 'https://github.com/o/built');
				expect(link).toHaveTextContent('1.2k');
			}
			// A count from the build costs readers no request.
			expect(fetch).not.toHaveBeenCalled();
		});

		it('fetch the count in the browser, once, when the build had none', async () => {
			const fetch = vi
				.fn()
				.mockResolvedValue(new Response(JSON.stringify({ stargazers_count: 56 }), { status: 200 }));
			vi.stubGlobal('fetch', fetch);
			site.github = 'https://github.com/o/fallback';
			render(Harness, { props: { view } });
			expect(screen.getAllByRole('link', { name: 'GitHub' })).toHaveLength(2);
			expect(await screen.findAllByRole('link', { name: 'GitHub, 56 stars' })).toHaveLength(2);
			expect(fetch).toHaveBeenCalledTimes(1);
		});

		it('keep the bare icon link when the browser cannot get a count either', async () => {
			const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
			vi.stubGlobal('fetch', fetch);
			site.github = 'https://github.com/o/offline';
			render(Harness, { props: { view } });
			await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
			const links = screen.getAllByRole('link', { name: 'GitHub' });
			expect(links).toHaveLength(2);
			for (const link of links) expect(link).not.toHaveTextContent(/\d/);
		});

		it('ask nothing with githubStars: false', () => {
			const fetch = vi.fn();
			vi.stubGlobal('fetch', fetch);
			site.github = 'https://github.com/o/off';
			site.githubStars = false;
			render(Harness, { props: { view } });
			expect(screen.getAllByRole('link', { name: 'GitHub' })).toHaveLength(2);
			expect(fetch).not.toHaveBeenCalled();
		});

		it('render nothing without site.github', () => {
			stars.count = 1234;
			render(Harness, { props: { view } });
			expect(screen.queryByRole('link', { name: /GitHub/ })).toBeNull();
		});
	});
});
