import { describe, expect, it } from 'vitest';
import {
	outsideCodeFences,
	proseLines,
	splitFrontmatter,
	withFrontmatter
} from './markdown-source.js';

describe('splitFrontmatter', () => {
	it('separates the YAML block from the body', () => {
		expect(splitFrontmatter('---\ntitle: X\n---\n\n# Heading\n')).toEqual({
			frontmatter: 'title: X',
			body: '\n# Heading\n'
		});
	});

	it('treats a page without frontmatter as all body', () => {
		expect(splitFrontmatter('# Heading\n')).toEqual({
			frontmatter: undefined,
			body: '# Heading\n'
		});
	});

	it('handles CRLF line endings', () => {
		expect(splitFrontmatter('---\r\ntitle: X\r\n---\r\nbody')).toEqual({
			frontmatter: 'title: X',
			body: 'body'
		});
	});

	// mdsvex strips through the first line starting with `---`, so reading the
	// block any more strictly here would disagree with the rendered page.
	it('ends the block on the first line starting with `---`, as mdsvex does', () => {
		expect(splitFrontmatter('---\ntitle: X\n----\nmore: y\n---\nbody')).toEqual({
			frontmatter: 'title: X',
			body: '-\nmore: y\n---\nbody'
		});
	});

	it('leaves a `---` thematic break in the body alone', () => {
		expect(splitFrontmatter('---\ntitle: X\n---\nabove\n\n---\n\nbelow\n').body).toBe(
			'above\n\n---\n\nbelow\n'
		);
	});

	it('reads a block that ends the page, with no body after it', () => {
		expect(splitFrontmatter('---\ntitle: X\n---')).toEqual({ frontmatter: 'title: X', body: '' });
	});

	it('keeps an unterminated block as body rather than swallowing the page', () => {
		expect(splitFrontmatter('---\ntitle: X\nbody')).toEqual({
			frontmatter: undefined,
			body: '---\ntitle: X\nbody'
		});
	});
});

describe('withFrontmatter', () => {
	it('rewrites the YAML and leaves the delimiters and body byte-identical', () => {
		expect(withFrontmatter('---\ntitle: X\n---\nbody\n', (front) => `${front}\norder: 2`)).toBe(
			'---\ntitle: X\norder: 2\n---\nbody\n'
		);
	});

	it('is a no-op on a page without frontmatter', () => {
		expect(withFrontmatter('body\n', () => 'title: X')).toBe('body\n');
	});

	it('passes the YAML text without its delimiters', () => {
		const seen: string[] = [];
		withFrontmatter('---\ntitle: X\n---\nbody', (front) => {
			seen.push(front);
			return front;
		});
		expect(seen).toEqual(['title: X']);
	});
});

describe('outsideCodeFences', () => {
	const upper = (text: string) => outsideCodeFences(text, (line) => line.toUpperCase());

	it('transforms prose and leaves fenced code verbatim', () => {
		expect(upper('a\n```\nb\n```\nc')).toBe('A\n```\nb\n```\nC');
	});

	it('does not close a fence on a longer marker carrying an info string', () => {
		const source = '````\n```svelte\ntext\n```\n````\ntext';
		const seen: string[] = [];
		outsideCodeFences(source, (chunk) => {
			seen.push(chunk);
			return chunk;
		});
		// Only the trailing line is prose; everything else sits inside the outer fence.
		expect(seen).toEqual(['text']);
	});

	it('protects indented and tilde fences', () => {
		expect(upper('- item\n  ```svelte\n  b\n  ```\n')).toBe('- ITEM\n  ```svelte\n  b\n  ```\n');
		expect(upper('~~~\nb\n~~~\nc')).toBe('~~~\nb\n~~~\nC');
	});

	it('does not close a backtick fence on a tilde marker', () => {
		expect(upper('```\n~~~\nb\n```\nc')).toBe('```\n~~~\nb\n```\nC');
	});

	it('closes on a marker longer than the opener when it carries no info string', () => {
		expect(upper('```\nb\n`````\nc')).toBe('```\nb\n`````\nC');
	});

	it('leaves an unclosed fence open to the end of the page', () => {
		expect(upper('a\n```\nb\nc')).toBe('A\n```\nb\nc');
	});
});

describe('proseLines', () => {
	const lines = (text: string) => [...proseLines(text)];

	it('yields body lines and drops fenced code with its markers', () => {
		expect(lines('a\n```ts\nconst b = 1;\n```\nc')).toEqual(['a', 'c']);
	});

	it('drops a nested fence whole', () => {
		expect(lines('a\n````\n```svelte\ninner\n```\n````\nb')).toEqual(['a', 'b']);
	});

	it('yields blank lines as they are, for callers that filter them', () => {
		expect(lines('a\n\nb')).toEqual(['a', '', 'b']);
	});
});
