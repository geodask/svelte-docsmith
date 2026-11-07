import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import SeoHead from './seo-head.svelte';

const config = { title: 'My Docs' };

describe('SeoHead robots', () => {
	afterEach(() => {
		document.head.querySelectorAll('meta[name="robots"]').forEach((n) => n.remove());
	});

	it('emits noindex for a hidden version', () => {
		render(SeoHead, { props: { config, title: 'Intro', noindex: true } });
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex, follow'
		);
	});

	it('omits the robots meta by default (indexable)', () => {
		render(SeoHead, { props: { config, title: 'Intro' } });
		expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
	});
});

describe('SeoHead canonical', () => {
	afterEach(() => {
		document.head
			.querySelectorAll('link[rel="canonical"], meta[property="og:url"]')
			.forEach((n) => {
				n.remove();
			});
	});

	const canonical = () => document.head.querySelector('link[rel="canonical"]');

	// The URL itself is resolved with the page view (`core/docs-page.ts`), which
	// covers the origin join and the missing-origin case; this pins the tags.
	it('emits the canonical link and og:url from the resolved URL', () => {
		render(SeoHead, {
			props: { config, title: 'Intro', canonical: 'https://x.dev/docs/v1/intro' }
		});
		expect(canonical()).toHaveAttribute('href', 'https://x.dev/docs/v1/intro');
		expect(document.head.querySelector('meta[property="og:url"]')).toHaveAttribute(
			'content',
			'https://x.dev/docs/v1/intro'
		);
	});

	it('omits both without a canonical URL', () => {
		render(SeoHead, { props: { config, title: 'Intro' } });
		expect(canonical()).toBeNull();
		expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
	});
});
