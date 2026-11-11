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

// What the head says is resolved and tested with the rest of the page view in
// `core/docs-page.ts`; this pins which tags the head writes from it.
describe('SeoHead', () => {
	it('writes the title, the description and the link preview tags from the view', () => {
		render(Harness, {
			props: { view: view('/docs/intro', { url: 'https://x.dev', ogImage: '/og.png' }) }
		});

		expect(document.title).toBe('Intro · My Docs');
		expect(head('meta[name="description"]')).toHaveAttribute('content', 'Start here');
		expect(head('link[rel="canonical"]')).toHaveAttribute('href', 'https://x.dev/docs/intro');
		expect(head('meta[name="robots"]')).toBeNull();

		expect(head('meta[property="og:title"]')).toHaveAttribute('content', 'Intro');
		expect(head('meta[property="og:description"]')).toHaveAttribute('content', 'Start here');
		expect(head('meta[property="og:site_name"]')).toHaveAttribute('content', 'My Docs');
		expect(head('meta[property="og:url"]')).toHaveAttribute('content', 'https://x.dev/docs/intro');
		expect(head('meta[property="og:image"]')).toHaveAttribute('content', 'https://x.dev/og.png');

		expect(head('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
		expect(head('meta[name="twitter:title"]')).toHaveAttribute('content', 'Intro');
		expect(head('meta[name="twitter:image"]')).toHaveAttribute('content', 'https://x.dev/og.png');
	});

	it('leaves out what the view has none of, and shows a small card without an image', () => {
		render(Harness, { props: { view: view('/docs/v1/intro', { description: undefined }) } });

		expect(head('meta[name="description"]')).toBeNull();
		expect(head('meta[property="og:description"]')).toBeNull();
		expect(head('link[rel="canonical"]')).toBeNull();
		expect(head('meta[property="og:url"]')).toBeNull();
		expect(head('meta[property="og:image"]')).toBeNull();
		expect(head('meta[name="twitter:image"]')).toBeNull();
		expect(head('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary');
	});

	it('keeps a version marked hidden out of search results', () => {
		render(Harness, { props: { view: view('/docs/v1/intro') } });

		expect(head('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
	});
});
