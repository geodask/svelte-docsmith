import { describe, expect, it } from 'vitest';
import { tocFromContent } from './from-content.js';

function container(html: string): HTMLElement {
	const el = document.createElement('div');
	el.innerHTML = html;
	return el;
}

describe('tocFromContent', () => {
	it('returns an empty array for a container with no headings', () => {
		expect(tocFromContent(container('<p>no headings</p>'))).toEqual([]);
	});

	it('turns h2 headings into top-level items with #id urls', () => {
		const toc = tocFromContent(container('<h2 id="one">One</h2><h2 id="two">Two</h2>'));
		expect(toc).toEqual([
			{ title: 'One', url: '#one', items: [] },
			{ title: 'Two', url: '#two', items: [] }
		]);
	});

	it('nests h3 under the preceding h2', () => {
		const toc = tocFromContent(
			container('<h2 id="a">A</h2><h3 id="a1">A1</h3><h3 id="a2">A2</h3><h2 id="b">B</h2>')
		);
		expect(toc).toHaveLength(2);
		expect(toc[0].items.map((i) => i.title)).toEqual(['A1', 'A2']);
		expect(toc[1].items).toEqual([]);
	});

	it('promotes a leading h3 (before any h2) to top level', () => {
		const toc = tocFromContent(container('<h3 id="orphan">Orphan</h3><h2 id="a">A</h2>'));
		expect(toc.map((i) => i.title)).toEqual(['Orphan', 'A']);
	});

	it('skips headings without an id', () => {
		const toc = tocFromContent(container('<h2>No id</h2><h2 id="keep">Keep</h2>'));
		expect(toc).toEqual([{ title: 'Keep', url: '#keep', items: [] }]);
	});

	it('trims heading text', () => {
		expect(tocFromContent(container('<h2 id="x">  Spaced  </h2>'))[0].title).toBe('Spaced');
	});

	it('honours a custom selector', () => {
		const toc = tocFromContent(container('<h2 id="a">A</h2><h4 id="deep">Deep</h4>'), 'h2, h4');
		expect(toc[0].items.map((i) => i.title)).toEqual(['Deep']);
	});
});
