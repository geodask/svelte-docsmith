import { describe, expect, it } from 'vitest';
import { extractLlmsContent, extractSearchText, extractToc, readingMinutes } from './extract.js';

/** A page that documents fenced code, so its samples nest one fence inside another. */
const NESTED_FENCE_BODY = [
	'## Real heading',
	'',
	'Real prose.',
	'',
	'````md',
	'```svelte',
	'## Fake heading',
	'',
	'Fake prose.',
	'```',
	'````',
	'',
	'## Trailing heading'
].join('\n');

const NESTED_FENCE_PAGE = `---\ntitle: Fences\n---\n\n${NESTED_FENCE_BODY}\n`;

describe('extractToc', () => {
	it('collects h2 and h3 headings with slugged ids', () => {
		const source = '---\ntitle: X\n---\n\n## Setup\n\n### Install it\n\n#### Too deep\n';
		expect(extractToc(source)).toEqual([
			{ id: 'setup', title: 'Setup', depth: 2 },
			{ id: 'install-it', title: 'Install it', depth: 3 }
		]);
	});

	it('suffixes duplicate slugs the way rehype-slug does', () => {
		expect(extractToc('## Usage\n\n## Usage\n').map((entry) => entry.id)).toEqual([
			'usage',
			'usage-1'
		]);
	});

	it('strips inline markdown from the label', () => {
		expect(extractToc('## Using `docsmith()` **now**\n')[0].title).toBe('Using docsmith() now');
	});

	it('ignores headings inside a fence nested in a longer fence', () => {
		expect(extractToc(NESTED_FENCE_PAGE).map((entry) => entry.title)).toEqual([
			'Real heading',
			'Trailing heading'
		]);
	});

	it('ignores headings inside a tilde fence', () => {
		expect(extractToc('~~~\n## Fake\n~~~\n\n## Real\n').map((entry) => entry.title)).toEqual([
			'Real'
		]);
	});
});

describe('extractSearchText', () => {
	it('keeps prose and heading text, dropping markdown punctuation', () => {
		const source = '---\ntitle: X\n---\n\n## Setup\n\n- A **bold** [link](/docs).\n';
		expect(extractSearchText(source)).toBe('Setup A bold link.');
	});

	it('drops frontmatter, script and style blocks', () => {
		const source = '---\ntitle: X\n---\n\n<script>\n\tlet secret = 1;\n</script>\n\nProse.\n';
		expect(extractSearchText(source)).toBe('Prose.');
	});

	it('drops a fence nested in a longer fence, along with its content', () => {
		const text = extractSearchText(NESTED_FENCE_PAGE);
		expect(text).toBe('Real heading Real prose. Trailing heading');
		expect(text).not.toContain('Fake');
	});

	it('drops table delimiter rows but keeps the cells', () => {
		expect(extractSearchText('| Prop | Type |\n| --- | :-: |\n| `open` | boolean |')).toBe(
			'Prop Type open boolean'
		);
	});
});

describe('readingMinutes', () => {
	it('rounds to whole minutes at 200 words a minute, never below one', () => {
		expect(readingMinutes('one two three')).toBe(1);
		expect(readingMinutes(Array(400).fill('word').join(' '))).toBe(2);
	});
});

describe('extractLlmsContent', () => {
	it('prepends the title and keeps fenced code intact', () => {
		expect(extractLlmsContent(NESTED_FENCE_PAGE, 'Fences')).toBe(
			`# Fences\n\n${NESTED_FENCE_BODY}`
		);
	});

	it('drops script and style blocks', () => {
		expect(
			extractLlmsContent('---\ntitle: X\n---\n\n<style>\n\ta {}\n</style>\n\nBody.', 'X')
		).toBe('# X\n\nBody.');
	});
});
