import { describe, expect, it } from 'vitest';
import { navFromContent, flattenNav, navTrail, isNavGroup } from './nav.js';
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

	it('breaks equal-order ties by title, deterministically regardless of input order', () => {
		const a: DocsContentItem[] = [
			{ title: 'Banana', path: '/b', section: 'G' },
			{ title: 'Apple', path: '/a', section: 'G' }
		];
		const b: DocsContentItem[] = [...a].reverse();
		expect(navFromContent(a)[0].items.map((i) => i.title)).toEqual(['Apple', 'Banana']);
		expect(navFromContent(b)[0].items.map((i) => i.title)).toEqual(['Apple', 'Banana']);
	});

	describe('nested sections (array path)', () => {
		it('nests a page under an array section path', () => {
			const content: DocsContentItem[] = [
				{ title: 'Middleware', path: '/mw', section: ['Guides', 'Advanced'], order: 1 }
			];
			expect(navFromContent(content)).toEqual([
				{
					title: 'Guides',
					items: [{ title: 'Advanced', items: [{ title: 'Middleware', url: '/mw' }] }]
				}
			]);
		});

		it('interleaves leaves and nested groups within a level by order', () => {
			const content: DocsContentItem[] = [
				{ title: 'Getting started', path: '/gs', section: 'Guides', order: 1 },
				{ title: 'Middleware', path: '/mw', section: ['Guides', 'Advanced'], order: 2 },
				{ title: 'Hooks', path: '/hooks', section: ['Guides', 'Advanced'], order: 3 }
			];
			const guides = navFromContent(content)[0];
			expect(guides.items.map((n) => n.title)).toEqual(['Getting started', 'Advanced']);
			const advanced = guides.items[1];
			expect(isNavGroup(advanced) && advanced.items.map((i) => i.title)).toEqual([
				'Middleware',
				'Hooks'
			]);
		});

		it('orders a nested group by the smallest order of its descendants', () => {
			const content: DocsContentItem[] = [
				{ title: 'Deep', path: '/deep', section: ['Guides', 'Advanced'], order: 1 },
				{ title: 'Shallow', path: '/shallow', section: 'Guides', order: 2 }
			];
			// Advanced (min order 1) sorts before the Guides-level leaf (order 2).
			expect(navFromContent(content)[0].items.map((n) => n.title)).toEqual(['Advanced', 'Shallow']);
		});

		it('drops blank segments and falls back to Docs for an all-blank path', () => {
			const content: DocsContentItem[] = [
				{ title: 'A', path: '/a', section: ['Guides', ''] },
				{ title: 'B', path: '/b', section: ['', '  '] }
			];
			const nav = navFromContent(content);
			expect(nav.map((g) => g.title).sort()).toEqual(['Docs', 'Guides']);
			expect(nav.find((g) => g.title === 'Guides')?.items).toEqual([{ title: 'A', url: '/a' }]);
		});
	});
});

describe('flattenNav', () => {
	it('returns leaves in depth-first reading order', () => {
		const content: DocsContentItem[] = [
			{ title: 'Getting started', path: '/gs', section: 'Guides', order: 1 },
			{ title: 'Middleware', path: '/mw', section: ['Guides', 'Advanced'], order: 2 },
			{ title: 'Hooks', path: '/hooks', section: ['Guides', 'Advanced'], order: 3 },
			{ title: 'Reference', path: '/ref', section: 'Reference', order: 4 }
		];
		expect(flattenNav(navFromContent(content)).map((i) => i.url)).toEqual([
			'/gs',
			'/mw',
			'/hooks',
			'/ref'
		]);
	});
});

describe('navTrail', () => {
	const nav = navFromContent([
		{ title: 'Middleware', path: '/mw', section: ['Guides', 'Advanced'], order: 1 },
		{ title: 'Intro', path: '/intro', section: 'Guides', order: 2 }
	]);

	it('returns the ancestor group titles for a nested page', () => {
		expect(navTrail(nav, '/mw')).toEqual(['Guides', 'Advanced']);
	});

	it('returns the single group for a top-level page', () => {
		expect(navTrail(nav, '/intro')).toEqual(['Guides']);
	});

	it('returns undefined for a page not in the tree', () => {
		expect(navTrail(nav, '/missing')).toBeUndefined();
	});
});
