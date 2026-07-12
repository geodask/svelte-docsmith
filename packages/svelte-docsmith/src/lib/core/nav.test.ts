import { describe, expect, it } from 'vitest';
import { navFromContent } from './nav.js';
import type { DocsContentItem } from './content.js';

describe('navFromContent', () => {
	it('returns an empty array for no content', () => {
		expect(navFromContent([])).toEqual([]);
	});

	it('groups items by section and maps path to url', () => {
		const content: DocsContentItem[] = [
			{ title: 'Intro', path: '/docs/intro', section: 'Guides', order: 1 },
			{ title: 'Setup', path: '/docs/setup', section: 'Guides', order: 2 }
		];
		expect(navFromContent(content)).toEqual([
			{
				title: 'Guides',
				items: [
					{ title: 'Intro', url: '/docs/intro' },
					{ title: 'Setup', url: '/docs/setup' }
				]
			}
		]);
	});

	it('falls back to a "Docs" group when section is missing', () => {
		expect(navFromContent([{ title: 'A', path: '/a' }])).toEqual([
			{ title: 'Docs', items: [{ title: 'A', url: '/a' }] }
		]);
	});

	it('sorts items within a group by order', () => {
		const content: DocsContentItem[] = [
			{ title: 'Third', path: '/c', section: 'G', order: 3 },
			{ title: 'First', path: '/a', section: 'G', order: 1 },
			{ title: 'Second', path: '/b', section: 'G', order: 2 }
		];
		expect(navFromContent(content)[0].items.map((i) => i.title)).toEqual([
			'First',
			'Second',
			'Third'
		]);
	});

	it('orders groups by the smallest order they contain', () => {
		const content: DocsContentItem[] = [
			{ title: 'Ref', path: '/ref', section: 'Reference', order: 5 },
			{ title: 'Intro', path: '/intro', section: 'Getting Started', order: 1 },
			{ title: 'Concept', path: '/concept', section: 'Concepts', order: 3 }
		];
		expect(navFromContent(content).map((g) => g.title)).toEqual([
			'Getting Started',
			'Concepts',
			'Reference'
		]);
	});

	it('treats a missing order as 0', () => {
		const content: DocsContentItem[] = [
			{ title: 'Ordered', path: '/o', section: 'G', order: 2 },
			{ title: 'Unordered', path: '/u', section: 'G' }
		];
		expect(navFromContent(content)[0].items.map((i) => i.title)).toEqual(['Unordered', 'Ordered']);
	});
});
