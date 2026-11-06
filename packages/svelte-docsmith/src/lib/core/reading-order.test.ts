import { describe, expect, it } from 'vitest';
import { readingSections, readingSequence, readingTree, sectionPath } from './reading-order.js';

const page = (title: string, section?: string | string[], order?: number) => ({
	title,
	section,
	order
});

describe('sectionPath', () => {
	it.each([
		[undefined, ['Docs']],
		['', ['Docs']],
		['Guides', ['Guides']],
		[
			['Guides', 'Advanced'],
			['Guides', 'Advanced']
		],
		[['Guides', ' ', ''], ['Guides']],
		[['', ''], ['Docs']]
	])('reads %j as %j', (section, path) => {
		expect(sectionPath(section)).toEqual(path);
	});
});

describe('reading order', () => {
	// Guides holds a page before and after its Advanced subgroup, so the three
	// views have to agree on an interleaved level.
	const pages = [
		page('Later', 'Later', 10),
		page('Three', 'Guides', 3),
		page('Deep B', ['Guides', 'Advanced'], 2),
		page('Deep A', ['Guides', 'Advanced'], 2),
		page('One', 'Guides', 1),
		page('Loose')
	];

	it('builds the sidebar tree, groups placed by their smallest order', () => {
		const titles = readingTree(pages).map((g) => g.title);
		expect(titles).toEqual(['Docs', 'Guides', 'Later']);
		const guides = readingTree(pages)[1];
		expect(guides.entries.map((e) => ('page' in e ? e.page.title : e.group.title))).toEqual([
			'One',
			'Advanced',
			'Three'
		]);
	});

	it('walks every page in sidebar order, ties broken by title', () => {
		expect(readingSequence(pages).map((p) => p.title)).toEqual([
			'Loose',
			'One',
			'Deep A',
			'Deep B',
			'Three',
			'Later'
		]);
	});

	it('flattens to sections, a nested one right after its parent', () => {
		expect(
			readingSections(pages).map(([heading, items]) => [heading, items.map((p) => p.title)])
		).toEqual([
			['Docs', ['Loose']],
			['Guides', ['One', 'Three']],
			['Guides / Advanced', ['Deep A', 'Deep B']],
			['Later', ['Later']]
		]);
	});

	it('gives a group with only subgroups no section of its own', () => {
		const sections = readingSections([page('X', ['Reference', 'API'])]);
		expect(sections.map(([heading]) => heading)).toEqual(['Reference / API']);
	});
});
