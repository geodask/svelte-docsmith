import { describe, expect, it } from 'vitest';
import { createSearchEngine } from './create-search.js';
import type { SearchDoc } from '$lib/core/content.js';

const docs: SearchDoc[] = [
	{
		path: '/docs/callout',
		title: 'Callout',
		section: 'Components',
		description: 'Draw attention to a note or warning.',
		headings: ['Usage', 'Props'],
		text: 'Highlight something the reader should not miss with a note tip warning or danger intent.'
	},
	{
		path: '/docs/theming',
		title: 'Theming',
		section: 'Guides',
		description: 'Customize the look.',
		headings: ['Colors', 'Tokens'],
		text: 'Customize colors typography and spacing with CSS variables and design tokens.'
	},
	{
		path: '/docs/installation',
		title: 'Installation',
		section: 'Getting Started',
		headings: ['Install'],
		text: 'Install the package with npm pnpm or yarn and add the vite plugin.'
	}
];

describe('createSearchEngine', () => {
	const engine = createSearchEngine(docs);

	it('returns nothing for an empty query', () => {
		expect(engine.search('')).toEqual([]);
		expect(engine.search('   ')).toEqual([]);
	});

	it('matches on the title', () => {
		const results = engine.search('theming');
		expect(results.map((r) => r.path)).toContain('/docs/theming');
	});

	it('matches on body text', () => {
		const results = engine.search('yarn');
		expect(results.map((r) => r.path)).toContain('/docs/installation');
	});

	it('matches on headings', () => {
		const results = engine.search('tokens');
		expect(results.map((r) => r.path)).toContain('/docs/theming');
	});

	it('returns full result rows with a snippet', () => {
		const [result] = engine.search('danger');
		expect(result).toMatchObject({
			path: '/docs/callout',
			title: 'Callout',
			section: 'Components'
		});
		expect(result.snippet.toLowerCase()).toContain('danger');
	});

	it('returns an empty array when nothing matches', () => {
		expect(engine.search('zzzznotpresent')).toEqual([]);
	});

	it('falls back to the description for the snippet when the body is empty', () => {
		const withoutBody = createSearchEngine([
			{
				path: '/docs/api',
				title: 'API',
				headings: [],
				description: 'The complete reference for every exported symbol.',
				text: ''
			}
		]);
		const [result] = withoutBody.search('reference');
		expect(result.snippet).toContain('reference for every exported symbol');
	});

	it('respects the result limit', () => {
		const many: SearchDoc[] = Array.from({ length: 10 }, (_, i) => ({
			path: `/docs/page-${i}`,
			title: `Page ${i}`,
			headings: [],
			text: 'shared keyword body content for every page'
		}));
		const results = createSearchEngine(many).search('keyword', 3);
		expect(results).toHaveLength(3);
	});

	it('scopes results to a version and still fills the limit past other versions', () => {
		const versioned: SearchDoc[] = [
			...Array.from({ length: 8 }, (_, i) => ({
				path: `/docs/v2/p${i}`,
				title: `p${i}`,
				headings: [],
				text: 'shared keyword body',
				version: 'v2'
			})),
			...Array.from({ length: 4 }, (_, i) => ({
				path: `/docs/v1/p${i}`,
				title: `p${i}`,
				headings: [],
				text: 'shared keyword body',
				version: 'v1'
			}))
		];
		const engine = createSearchEngine(versioned);

		const v1 = engine.search('keyword', 8, 'v1');
		expect(v1.length).toBe(4);
		expect(v1.every((r) => r.version === 'v1')).toBe(true);

		// No version ⇒ results span every version.
		expect(new Set(engine.search('keyword', 20).map((r) => r.version))).toEqual(
			new Set(['v1', 'v2'])
		);
	});
});
