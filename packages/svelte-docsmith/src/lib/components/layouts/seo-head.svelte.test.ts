import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { resolveDocsPage, resolveVersions, type DocsmithSite } from '#lib/core/index.js';
import type { DocsContentItem } from '#lib/core/index.js';

const site: DocsmithSite = vi.hoisted(() => ({ title: 'My Docs', description: 'Site blurb' }));
vi.mock('svelte-docsmith/site', async () =>
	(await import('#lib/fallbacks/_fixtures/site-module.js')).siteModule({ site })
);
import Harness from './_fixtures/seo-head-harness.svelte';

const content: DocsContentItem[] = [
	{ title: 'Intro', path: '/docs/intro', description: 'Start here', version: 'v2' },
	{ title: 'Intro', path: '/docs/v1/intro', version: 'v1' }
];
const versions = resolveVersions(
	{ current: { id: 'v2', label: 'v2' }, archived: [{ id: 'v1', label: 'v1', noindex: true }] },
	'/docs',
	content
);

const view = (pathname: string, over: Partial<DocsmithSite> = {}) =>
	resolveDocsPage({ content, versions, pathname, site: { ...site, ...over } });

const head = (selector: string) => document.head.querySelector(selector);

afterEach(() => {
	document.head
		.querySelectorAll('title, meta, link[rel="canonical"]')
		.forEach((node) => node.remove());
});

// What the page is (its entry, canonical URL and version) is resolved and tested
// in `core/docs-page.ts`; this pins which tags the head emits from it.
describe('SeoHead title and description', () => {
	it("uses the doc page's frontmatter, suffixed with the site title", () => {
		render(Harness, { props: { view: view('/docs/intro') } });
		expect(document.title).toBe('Intro · My Docs');
		expect(head('meta[name="description"]')).toHaveAttribute('content', 'Start here');
	});

	it('lets the shell override both', () => {
		render(Harness, {
			props: { view: view('/docs/intro'), title: 'Custom', description: 'Custom blurb' }
		});
		expect(document.title).toBe('Custom · My Docs');
		expect(head('meta[name="description"]')).toHaveAttribute('content', 'Custom blurb');
	});

	it('falls back to the site title and description off a doc page', () => {
		render(Harness, { props: { view: view('/') } });
		expect(document.title).toBe('My Docs');
		expect(head('meta[name="description"]')).toHaveAttribute('content', 'Site blurb');
	});
});

describe('SeoHead robots', () => {
	it('emits noindex on a version marked hidden', () => {
		render(Harness, { props: { view: view('/docs/v1/intro') } });
		expect(head('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
	});

	it('omits the robots meta by default (indexable)', () => {
		render(Harness, { props: { view: view('/docs/intro') } });
		expect(head('meta[name="robots"]')).toBeNull();
	});
});

describe('SeoHead canonical', () => {
	it("emits the canonical link and og:url from the view's canonical URL", () => {
		render(Harness, { props: { view: view('/docs/v1/intro', { url: 'https://x.dev' }) } });
		expect(head('link[rel="canonical"]')).toHaveAttribute('href', 'https://x.dev/docs/v1/intro');
		expect(head('meta[property="og:url"]')).toHaveAttribute(
			'content',
			'https://x.dev/docs/v1/intro'
		);
	});

	it('omits both without site.url', () => {
		render(Harness, { props: { view: view('/docs/intro') } });
		expect(head('link[rel="canonical"]')).toBeNull();
		expect(head('meta[property="og:url"]')).toBeNull();
	});
});

describe('SeoHead image', () => {
	afterEach(() => {
		delete site.url;
		delete site.ogImage;
		delete site.ogImages;
	});

	const image = () => head('meta[property="og:image"]')?.getAttribute('content');
	const card = () => head('meta[name="twitter:card"]')?.getAttribute('content');

	it("uses the site's image, absolute against site.url", () => {
		Object.assign(site, { url: 'https://x.dev', ogImage: '/og.png' });
		render(Harness, { props: { view: view('/docs/intro') } });
		expect(image()).toBe('https://x.dev/og.png');
		expect(card()).toBe('summary_large_image');
	});

	it('points a doc page at its own OG image when the site serves them', () => {
		Object.assign(site, { url: 'https://x.dev', ogImage: '/og.png', ogImages: '/og' });
		render(Harness, { props: { view: view('/docs/v1/intro') } });
		expect(image()).toBe('https://x.dev/og/docs/v1/intro.png');
		expect(head('meta[name="twitter:image"]')).toHaveAttribute(
			'content',
			'https://x.dev/og/docs/v1/intro.png'
		);
	});

	it("keeps the site's image off a doc page", () => {
		Object.assign(site, { url: 'https://x.dev', ogImage: '/og.png', ogImages: '/og' });
		render(Harness, { props: { view: view('/') } });
		expect(image()).toBe('https://x.dev/og.png');
	});

	it('emits no image, and a small card, with neither', () => {
		render(Harness, { props: { view: view('/docs/intro') } });
		expect(image()).toBeUndefined();
		expect(card()).toBe('summary');
	});
});
