import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contentIndex, llmsIndex, searchIndex } from './collect.js';
import { toPage, type SourcePage } from './pages.js';
import type { DocsVersions } from '$lib/core/version.js';

const routesDir = path.resolve('/app/src/routes');
const contentDir = path.join(routesDir, 'docs');

/** A page as it would have been read from `<docs root>/<relDir>/+page.md`. */
function page(relDir: string, frontmatter: string, body = '# body'): SourcePage {
	const file = path.join(contentDir, relDir, '+page.md');
	return toPage(file, `---\n${frontmatter}\n---\n\n${body}\n`);
}

const options = { contentDir, routesDir };

describe('contentIndex', () => {
	it('reads frontmatter and derives the URL from the page directory', () => {
		const pages = [
			page('introduction', 'title: Introduction\nsection: Guides\norder: 1'),
			page('', 'title: Overview\norder: 0')
		];

		expect(contentIndex(pages, options)).toEqual([
			{
				title: 'Overview',
				path: '/docs',
				description: undefined,
				section: undefined,
				order: 0,
				sourcePath: expect.any(String),
				lastUpdated: undefined,
				readingTime: 1,
				toc: []
			},
			{
				title: 'Introduction',
				path: '/docs/introduction',
				description: undefined,
				section: 'Guides',
				order: 1,
				sourcePath: expect.any(String),
				lastUpdated: undefined,
				readingTime: 1,
				toc: []
			}
		]);
	});

	it('tags archive folders by id, and everything else as the current version', () => {
		const versions: DocsVersions = {
			current: { id: 'v2', label: 'v2' },
			archived: [{ id: 'v1', label: 'v1' }]
		};
		const pages = [
			page('intro', 'title: Intro'),
			page('guides/deep/nested', 'title: Nested'),
			page('v1/intro', 'title: Intro')
		];

		const version = Object.fromEntries(
			contentIndex(pages, { ...options, versions }).map((d) => [d.path, d.version])
		);

		expect(version['/docs/intro']).toBe('v2');
		// A section folder is not an archive, so its pages stay on the current version.
		expect(version['/docs/guides/deep/nested']).toBe('v2');
		expect(version['/docs/v1/intro']).toBe('v1');
	});

	it('leaves the version undefined on an unversioned site', () => {
		expect(contentIndex([page('intro', 'title: Intro')], options)[0].version).toBeUndefined();
	});

	// With `content: 'src/routes'` the docs base is `/`, so a page's first URL
	// segment is its version candidate with nothing in front of it.
	it('tags archives when the docs sit at the routes root', () => {
		const versions: DocsVersions = {
			current: { id: 'v2', label: 'v2' },
			archived: [{ id: 'v1', label: 'v1' }]
		};
		const rooted = (relDir: string, frontmatter: string) =>
			toPage(path.join(routesDir, relDir, '+page.md'), `---\n${frontmatter}\n---\n\n# body\n`);
		const pages = [
			rooted('', 'title: Home'),
			rooted('intro', 'title: Intro'),
			rooted('v1/intro', 'title: Intro')
		];

		const version = Object.fromEntries(
			contentIndex(pages, { contentDir: routesDir, routesDir, versions }).map((d) => [
				d.path,
				d.version
			])
		);

		expect(version['/']).toBe('v2');
		expect(version['/intro']).toBe('v2');
		expect(version['/v1/intro']).toBe('v1');
	});

	it('carries through the date the page was given', () => {
		const dated = { ...page('intro', 'title: Intro'), lastUpdated: '2026-03-04' };

		expect(contentIndex([dated], options)[0].lastUpdated).toBe('2026-03-04');
	});

	it('estimates reading time from the body word count (~200 wpm, min 1)', () => {
		const pages = [
			page('short', 'title: Short', 'Just a few words here.'),
			page('long', 'title: Long', `## Heading\n\n${'word '.repeat(600)}`)
		];

		const byPath = Object.fromEntries(contentIndex(pages, options).map((d) => [d.path, d]));

		// A handful of words still rounds up to 1 minute.
		expect(byPath['/docs/short'].readingTime).toBe(1);
		// ~601 words / 200 wpm rounds to 3.
		expect(byPath['/docs/long'].readingTime).toBe(3);
	});

	it('extracts an h2/h3 TOC from the body, skipping code fences', () => {
		const body = [
			'## Getting started',
			'',
			'```md',
			'## not a heading',
			'```',
			'',
			'### A `code` sub-step'
		].join('\n');

		const [doc] = contentIndex([page('guide', 'title: Guide', body)], options);

		expect(doc.toc).toEqual([
			{ id: 'getting-started', title: 'Getting started', depth: 2 },
			{ id: 'a-code-sub-step', title: 'A code sub-step', depth: 3 }
		]);
	});

	it('slugs headings exactly like rehype-slug (github-slugger), incl. dupes', () => {
		const body = ['## Anchors & copy buttons', '', '## Usage', '', '## Usage'].join('\n');

		const [doc] = contentIndex([page('slugs', 'title: Slugs', body)], options);

		expect((doc.toc ?? []).map((t) => t.id)).toEqual([
			// github-slugger drops `&` but keeps the surrounding spaces → double hyphen,
			// where the old hand-rolled slugify collapsed it to a single hyphen.
			'anchors--copy-buttons',
			'usage',
			'usage-1'
		]);
	});

	it('handles quoted values and colons inside frontmatter', () => {
		const [doc] = contentIndex(
			[page('x', 'title: "A: the beginning"\ndescription: "Uses http://x"')],
			options
		);

		expect(doc.title).toBe('A: the beginning');
		expect(doc.description).toBe('Uses http://x');
	});

	it('skips pages without a title', () => {
		const pages = [page('titled', 'title: Kept'), page('untitled', 'description: no title here')];

		expect(contentIndex(pages, options).map((d) => d.title)).toEqual(['Kept']);
	});
});

describe('searchIndex', () => {
	it('reduces a page to plain-text body, headings, and metadata', () => {
		const body = [
			'<script>',
			"\timport { Callout } from 'svelte-docsmith';",
			'</script>',
			'',
			'## Getting started',
			'',
			'Install the **package** and import `Callout` from [the library](/docs).',
			'',
			'```bash',
			'npm i secretcode',
			'```',
			'',
			'<Callout variant="tip">',
			'',
			'This is a helpful tip.',
			'',
			'</Callout>'
		].join('\n');

		const [doc] = searchIndex(
			[page('guide', 'title: Guide\ndescription: How to use it\nsection: Guides', body)],
			options
		);

		expect(doc.path).toBe('/docs/guide');
		expect(doc.title).toBe('Guide');
		expect(doc.description).toBe('How to use it');
		expect(doc.section).toBe('Guides');
		expect(doc.headings).toEqual(['Getting started']);

		// Prose is kept as plain text, with markdown punctuation resolved.
		expect(doc.text).toContain('Getting started');
		expect(doc.text).toContain('Install the package and import Callout from the library');
		expect(doc.text).toContain('This is a helpful tip.');
		// Code fences, <script> blocks, and tag syntax are dropped.
		expect(doc.text).not.toContain('secretcode');
		expect(doc.text).not.toContain('import {');
		expect(doc.text).not.toContain('variant');
		expect(doc.text).not.toMatch(/[*`[\]]/);
	});

	it('strips markdown table structure from the body text', () => {
		const body = [
			'| Name | Type |',
			'| ---- | ---- |',
			'| variant | string |',
			'| title | string |'
		].join('\n');

		const [doc] = searchIndex([page('table', 'title: Reference', body)], options);

		expect(doc.text).not.toContain('|');
		expect(doc.text).not.toContain('----');
		// Cell words survive as plain prose.
		expect(doc.text).toContain('Name Type');
		expect(doc.text).toContain('variant string');
	});

	it('labels a nested section with its most specific segment', () => {
		const [doc] = searchIndex(
			[page('deep', 'title: Deep\nsection:\n  - Guides\n  - Advanced')],
			options
		);

		expect(doc.section).toBe('Advanced');
	});

	it('skips pages without a title and sorts by path', () => {
		const pages = [
			page('b', 'title: Bravo', 'Second.'),
			page('a', 'title: Alpha', 'First.'),
			page('untitled', 'description: no title', 'Ignored.')
		];

		expect(searchIndex(pages, options).map((d) => d.path)).toEqual(['/docs/a', '/docs/b']);
	});
});

describe('llmsIndex', () => {
	it('keeps the markdown body with headings and code, dropping frontmatter and script/style', () => {
		const body = [
			'<script>',
			"\timport { Callout } from 'svelte-docsmith';",
			'</script>',
			'<style>.x { color: red; }</style>',
			'',
			'## Getting started',
			'',
			'Install the **package**.',
			'',
			'```bash',
			'npm i thing',
			'```'
		].join('\n');

		const [doc] = llmsIndex(
			[page('guide', 'title: Guide\ndescription: How to use it\nsection: Guides', body)],
			options
		);

		expect(doc.path).toBe('/docs/guide');
		expect(doc.title).toBe('Guide');
		expect(doc.description).toBe('How to use it');
		expect(doc.section).toBe('Guides');
		// Title prepended as an h1; markdown headings and code fences preserved.
		expect(doc.content.startsWith('# Guide\n\n')).toBe(true);
		expect(doc.content).toContain('## Getting started');
		expect(doc.content).toContain('Install the **package**.');
		expect(doc.content).toContain('```bash\nnpm i thing\n```');
		// Frontmatter, script, and style blocks are removed.
		expect(doc.content).not.toContain('---');
		expect(doc.content).not.toContain('import {');
		expect(doc.content).not.toContain('color: red');
	});

	it('joins a nested section path so the pages group under one heading', () => {
		const [doc] = llmsIndex(
			[page('deep', 'title: Deep\nsection:\n  - Guides\n  - Advanced')],
			options
		);

		expect(doc.section).toBe('Guides / Advanced');
	});

	it('skips pages without a title and sorts by path', () => {
		const pages = [
			page('b', 'title: Bravo', 'Second.'),
			page('a', 'title: Alpha', 'First.'),
			page('untitled', 'description: no title', 'Ignored.')
		];

		expect(llmsIndex(pages, options).map((d) => d.path)).toEqual(['/docs/a', '/docs/b']);
	});
});
