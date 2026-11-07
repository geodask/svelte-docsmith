import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from './frontmatter.js';

describe('parseFrontmatter', () => {
	it('parses the leading YAML block', () => {
		expect(parseFrontmatter('---\ntitle: X\norder: 2\n---\n\n# body\n', 'page.md')).toEqual({
			title: 'X',
			order: 2
		});
	});

	// YAML 1.1 parsers read an unquoted date as a Date, which the `lastUpdated`
	// check would reject. js-yaml 5 keeps it a string, as the check expects.
	it('keeps an unquoted date a string', () => {
		expect(parseFrontmatter('---\nlastUpdated: 2024-01-15\n---\n', 'page.md')).toEqual({
			lastUpdated: '2024-01-15'
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

	// js-yaml 4 turned an unquoted date into a Date object, which pages.ts then
	// ignored because it only accepts a string `lastUpdated`.
	it('keeps an unquoted date as a string', () => {
		expect(parseFrontmatter('---\nlastUpdated: 2024-01-02\n---\n', 'page.md')).toEqual({
			lastUpdated: '2024-01-02'
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
