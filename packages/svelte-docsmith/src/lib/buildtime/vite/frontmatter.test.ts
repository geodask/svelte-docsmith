import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from './frontmatter.js';

describe('parseFrontmatter', () => {
	it('parses the leading YAML block', () => {
		expect(parseFrontmatter('---\ntitle: X\norder: 2\n---\n\n# body\n', 'page.md')).toEqual({
			title: 'X',
			order: 2
		});
	});

	it('returns an empty object for a page without frontmatter', () => {
		expect(parseFrontmatter('# body\n', 'page.md')).toEqual({});
		expect(parseFrontmatter('---\ntitle: X\nnever closed', 'page.md')).toEqual({});
	});

	// The renderer's rule: remark-frontmatter closes on the first line starting
	// with `---`, so a page mdsvex renders body-only keeps its nav entry here.
	it('closes the block the way mdsvex does', () => {
		expect(parseFrontmatter('---\ntitle: X\n--- stray\nbody', 'page.md')).toEqual({ title: 'X' });
		expect(parseFrontmatter('---\ntitle: X\n----\nbody', 'page.md')).toEqual({ title: 'X' });
	});

	it('ignores a `---` thematic break further down the page', () => {
		expect(parseFrontmatter('---\ntitle: X\n---\n\nabove\n\n---\n\nbelow\n', 'page.md')).toEqual({
			title: 'X'
		});
	});

	it('throws with the filename on invalid YAML', () => {
		expect(() => parseFrontmatter('---\ntitle: "unterminated\n---\nbody', 'docs/page.md')).toThrow(
			/invalid YAML frontmatter in docs\/page\.md/
		);
	});

	it('ignores frontmatter that is not a mapping', () => {
		expect(parseFrontmatter('---\njust a string\n---\nbody', 'page.md')).toEqual({});
	});
});
