import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/docs/v1/intro') } }));
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

	it('makes the canonical absolute against the configured url', () => {
		render(SeoHead, { props: { config: { ...config, url: 'https://x.dev' }, title: 'Intro' } });
		expect(canonical()).toHaveAttribute('href', 'https://x.dev/docs/v1/intro');
	});

	it('does not double the slash when the configured url has a trailing one', () => {
		render(SeoHead, { props: { config: { ...config, url: 'https://x.dev/' }, title: 'Intro' } });
		expect(canonical()).toHaveAttribute('href', 'https://x.dev/docs/v1/intro');
	});

	// A relative canonical would be worse than none: it would tell crawlers every
	// page is canonical to itself under whatever host served it.
	it('omits the canonical entirely when no url is configured', () => {
		render(SeoHead, { props: { config, title: 'Intro' } });
		expect(canonical()).toBeNull();
		expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
	});
});
