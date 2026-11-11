import { describe, expect, it } from 'vitest';
import { codeBlockRenderer } from './code-block.js';
import { markdownCompiler } from './markdown.js';
import { readPage } from './page-reading.js';
import { extractToc } from './vite/extract.js';

const page = (body: string) => `---\ntitle: Target\n---\n\n${body}\n`;

describe('readPage: headings', () => {
	it('reads every heading with its level, id and plain title', () => {
		const { headings } = readPage(
			page('# Top\n\n## Using `docsmith()` **now**\n\n#### Deep [link](/docs/x) text')
		);

		expect(headings).toEqual([
			{ depth: 1, id: 'top', title: 'Top' },
			{ depth: 2, id: 'using-docsmith-now', title: 'Using docsmith() now' },
			{ depth: 4, id: 'deep-link-text', title: 'Deep link text' }
		]);
	});

	it('keeps an underscore in the id and the title', () => {
		expect(readPage(page('## my_prop')).headings).toEqual([
			{ depth: 2, id: 'my_prop', title: 'my_prop' }
		]);
	});

	it('numbers a repeated heading across every level, as the compiled page does', () => {
		const { headings } = readPage(page('## Example\n\n#### Example\n\n### Example'));

		expect(headings.map(({ id }) => id)).toEqual(['example', 'example-1', 'example-2']);
	});

	it('reads a heading in a list or a quote, and none in code or an HTML block', () => {
		const { headings } = readPage(
			page(
				[
					'- ## In a list',
					'',
					'> ## In a quote',
					'',
					'<div>',
					'## Inside an HTML block',
					'</div>',
					'',
					'```md',
					'## In a fence',
					'```',
					'',
					'    ## Indented code',
					'',
					'`## inline code`'
				].join('\n')
			)
		);

		expect(headings.map(({ title }) => title)).toEqual(['In a list', 'In a quote']);
	});

	it('reads the same source once', () => {
		const source = page('## Once');

		expect(readPage(source)).toBe(readPage(source));
	});
});

describe('readPage: against the compiler', () => {
	const body = [
		'# Getting started',
		'',
		'## Install `svelte-docsmith`',
		'',
		'## What’s *new* in **v2**?',
		'',
		'## A [linked](/docs/intro) heading',
		'',
		'## <span>Inline HTML</span> & entities &amp; more',
		'',
		'### Escaped \\*stars\\* and under_scores',
		'',
		'#### Héllo wörld — ünïcode',
		'',
		'## my_prop',
		'',
		'##### Example',
		'',
		'###### Example',
		'',
		'### Example',
		'',
		'- ## In a list',
		'',
		'<div>',
		'## Not a heading',
		'</div>',
		'',
		'Setext heading',
		'--------------',
		'',
		'## Trailing hashes ##',
		'',
		'## Dashes -- and --- and "quotes"... it\'s smart',
		'',
		'## Symbols &copy; &#169; &#x41;',
		'',
		'## An <code id="in-heading">id</code> inside',
		'',
		'<div id="hand-written"></div>',
		'',
		'```md',
		'## Not a heading either',
		'```'
	].join('\n');
	const source = page(body);
	const compile = async () =>
		(await markdownCompiler({}, codeBlockRenderer({}))(source, '/site/src/routes/docs/+page.md'))!
			.code;

	it('gives every anchor the id the compiled page renders', async () => {
		const rendered = [...(await compile()).matchAll(/<[\w.]+(?:\s[^>]*?)?\sid="([^"]*)"/g)];

		expect(rendered.length).toBeGreaterThan(10);
		expect(readPage(source).anchors).toEqual(rendered.map((match) => match[1]));
	});

	it('gives the table of contents the h2 and h3 ids the compiled page renders', async () => {
		const rendered = [
			...(await compile()).matchAll(/<(?:Components\.)?h[23]\b[^>]*?\sid="([^"]*)"/g)
		];

		expect(rendered.length).toBeGreaterThan(8);
		expect(extractToc(source).map(({ id }) => id)).toEqual(rendered.map((match) => match[1]));
	});
});

describe('readPage: links', () => {
	it('reads markdown and raw links with the line each is written on', () => {
		const { links } = readPage(
			page('See [one](/docs/one).\n\n`[code](/docs/no)`\n\n<a href="/docs/two">two</a>')
		);

		expect(links).toEqual([
			{ href: '/docs/one', line: 5 },
			{ href: '/docs/two', line: 9 }
		]);
	});
});
