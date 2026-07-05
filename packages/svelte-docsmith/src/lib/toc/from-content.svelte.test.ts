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

	it('returns h2 headings as depth-2 items in document order', () => {
		const toc = tocFromContent(container('<h2 id="one">One</h2><h2 id="two">Two</h2>'));
		expect(toc).toEqual([
			{ id: 'one', title: 'One', depth: 2 },
			{ id: 'two', title: 'Two', depth: 2 }
		]);
	});

	it('marks h3 headings as depth 3, keeping document order', () => {
		const toc = tocFromContent(
			container('<h2 id="a">A</h2><h3 id="a1">A1</h3><h3 id="a2">A2</h3><h2 id="b">B</h2>')
		);
		expect(toc).toEqual([
			{ id: 'a', title: 'A', depth: 2 },
			{ id: 'a1', title: 'A1', depth: 3 },
			{ id: 'a2', title: 'A2', depth: 3 },
			{ id: 'b', title: 'B', depth: 2 }
		]);
	});

	it('skips headings without an id', () => {
		const toc = tocFromContent(container('<h2>No id</h2><h2 id="keep">Keep</h2>'));
		expect(toc).toEqual([{ id: 'keep', title: 'Keep', depth: 2 }]);
	});

	it('trims heading text', () => {
		expect(tocFromContent(container('<h2 id="x">  Spaced  </h2>'))[0].title).toBe('Spaced');
	});

	it('honours a custom selector', () => {
		const toc = tocFromContent(container('<h2 id="a">A</h2><h4 id="deep">Deep</h4>'), 'h2, h4');
		expect(toc.map((i) => i.id)).toEqual(['a', 'deep']);
	});
});
