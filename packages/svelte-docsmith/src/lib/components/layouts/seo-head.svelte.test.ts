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
