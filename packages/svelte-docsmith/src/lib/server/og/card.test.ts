import { describe, expect, it } from 'vitest';
import { clip, ogCard, type OgNode } from './card.js';
import { DEFAULT_OG_COLOURS } from './colours.js';

/** Every string drawn on the card, in order. */
function texts(node: OgNode | string): string[] {
	if (typeof node === 'string') return node ? [node] : [];
	const children = node.props.children;
	if (children === undefined) return [];
	return (Array.isArray(children) ? children : [children]).flatMap(texts);
}

describe('clip', () => {
	it('leaves short text alone and collapses whitespace', () => {
		expect(clip('  Quick\n start ', 20)).toBe('Quick start');
	});

	it('cuts at a word boundary with an ellipsis', () => {
		expect(clip('Install the package and add the Vite plugin', 30)).toBe(
			'Install the package and add…'
		);
	});

	it('cuts mid-word when no boundary is close', () => {
		expect(clip('Supercalifragilisticexpialidocious', 10)).toBe('Supercali…');
	});
});

describe('ogCard', () => {
	it('draws the site, eyebrow, title, description and host in reading order', () => {
		const card = ogCard({
			site: 'My Docs',
			title: 'Quick start',
			description: 'Up and running in a minute.',
			eyebrow: 'v1.x · Guides',
			host: 'docs.example.com',
			colours: DEFAULT_OG_COLOURS
		});
		expect(texts(card)).toEqual([
			'My Docs',
			'v1.x · Guides',
			'Quick start',
			'Up and running in a minute.',
			'docs.example.com'
		]);
	});

	it('leaves out what a page lacks', () => {
		const card = ogCard({ site: 'My Docs', title: 'Intro', colours: DEFAULT_OG_COLOURS });
		expect(texts(card)).toEqual(['My Docs', 'Intro']);
	});

	it('is painted in the theme colours', () => {
		const colours = { ...DEFAULT_OG_COLOURS, background: '#000001', primary: '#0000ff' };
		const style = ogCard({ site: 'S', title: 'T', colours }).props.style!;
		expect(style.backgroundColor).toBe('#000001');
		expect(style.borderTop).toContain('#0000ff');
	});

	it('cuts a long description so the footer stays on the card', () => {
		const card = ogCard({
			site: 'S',
			title: 'T',
			description: 'word '.repeat(100),
			colours: DEFAULT_OG_COLOURS
		});
		const description = texts(card)[2];
		expect(description.length).toBeLessThanOrEqual(150);
		expect(description.endsWith('…')).toBe(true);
	});
});
