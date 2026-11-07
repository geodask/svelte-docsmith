import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { resolveDocsPage, resolveVersions, type DocsmithSite } from '#lib/core/index.js';
import type { DocsContentItem } from '#lib/core/index.js';

const site: DocsmithSite = vi.hoisted(() => ({ title: 'My Docs', description: 'Site blurb' }));
vi.mock('svelte-docsmith/site', () => ({ site }));
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
