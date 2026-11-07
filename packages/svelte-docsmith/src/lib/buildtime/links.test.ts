import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { brokenLinks } from './links.js';
import { toPage, type SourcePage } from './vite/pages.js';
import type { DocsVersions } from '#lib/core/version.js';

const routesDir = path.resolve('/app/src/routes');
const contentDir = path.join(routesDir, 'docs');

/** The absolute file of the page at `<docs root>/<relDir>/+page.md`. */
const fileOf = (relDir: string) => path.join(contentDir, relDir, '+page.md');

/**
 * A page as it would have been read from `<docs root>/<relDir>/+page.md`: three
 * lines of frontmatter, a blank line, then `body` from line 5.
 */
function page(relDir: string, body = '# body', title: string | null = 'Page'): SourcePage {
	const frontmatter = title === null ? 'description: untitled' : `title: ${title}`;
	return toPage(fileOf(relDir), `---\n${frontmatter}\n---\n\n${body}\n`);
}

const options = { contentDir, routesDir };

describe('brokenLinks', () => {
	it('reports a markdown link to a docs path that is no page, with its file and line', () => {
		const pages = [
			page('intro', 'Read the [theming guide](/docs/theeming) first.'),
			page('theming')
		];

		expect(brokenLinks(pages, options)).toEqual([
			{
				file: fileOf('intro'),
				line: 5,
				link: '/docs/theeming',
				problem: { type: 'no-page', path: '/docs/theeming' }
			}
		]);
	});

	it('accepts a link to any page, titled or not, the docs root included', () => {
		const pages = [
			page('', 'See [intro](/docs/intro), [draft](/docs/draft) and [home](/docs).'),
			page('intro'),
			page('draft', '# body', null)
		];

		// An untitled page is in no index, but Kit still serves it.
		expect(brokenLinks(pages, options)).toEqual([]);
	});

	it('counts lines from the top of the file, frontmatter included', () => {
		const body = [
			'# Title',
			'',
			'A paragraph that runs',
			'onto a second line with [a link](/docs/one).',
			'',
			'- an item',
			'- an item with [another](/docs/two)'
		].join('\n');

		const found = brokenLinks([page('intro', body)], options);

		expect(found.map(({ line, link }) => ({ line, link }))).toEqual([
			{ line: 8, link: '/docs/one' },
			{ line: 11, link: '/docs/two' }
		]);
	});

	it('finds links in headings, emphasis, quotes, nested lists, tables and references', () => {
		const body = [
			'## See [heading](/docs/a)', // 5
			'',
			'Some **[strong](/docs/b)** text.', // 7
			'',
			'> quoted', // 9
			'> [quote](/docs/c)', // 10
			'',
			'- item', // 12
			'  - nested [nested](/docs/d)', // 13
			'',
			'| a | b |', // 15
			'| - | - |',
			'| [cell](/docs/e) | x |', // 17
			'',
			'A [reference][ref] link.', // 19
			'',
			'[ref]: /docs/f'
		].join('\n');

		const found = brokenLinks([page('intro', body)], options);

		expect(found.map(({ line, link }) => `${line} ${link}`)).toEqual([
			'5 /docs/a',
			'7 /docs/b',
			'10 /docs/c',
			'13 /docs/d',
			'17 /docs/e',
			'19 /docs/f'
		]);
	});

	it('ignores links inside code blocks and inline code', () => {
		const body = [
			'Write `[x](/docs/inline)` to link.',
			'',
			'```md',
			'[x](/docs/fenced)',
			'```',
			'',
			'~~~~',
			'```',
			'[x](/docs/nested-fence)',
			'```',
			'~~~~',
			'',
			'    [x](/docs/indented)',
			'',
			'But [this one](/docs/inline) is a link.'
		].join('\n');

		const found = brokenLinks([page('intro', body)], options);

		// The same link written in inline code earlier doesn't pull the line up.
		expect(found.map(({ line, link }) => `${line} ${link}`)).toEqual(['19 /docs/inline']);
	});

	it('leaves other origins and paths outside the docs base alone', () => {
		const body = [
			'[a](https://example.com/docs/nope)',
			'[b](//cdn.example.com/docs/nope)',
			'[c](mailto:hi@example.com)',
			'[d](/)',
			'[e](/llms.txt)',
			'[f](/changelog)',
			'[g](/docsearch)',
			'<https://example.com/docs/nope>'
		].join('\n\n');

		expect(brokenLinks([page('intro', body)], options)).toEqual([]);
	});

	it('leaves images alone: they are not links to pages', () => {
		expect(brokenLinks([page('intro', '![logo](/docs/logo.png)')], options)).toEqual([]);
	});

	it('checks the page a link with a fragment or query points at', () => {
		const body = '[a](/docs/theming#tokens) [b](/docs/nope#x) [c](/docs/theming?tab=svelte)';

		const found = brokenLinks([page('intro', body), page('theming')], options);

		expect(found).toEqual([
			expect.objectContaining({
				link: '/docs/nope#x',
				problem: { type: 'no-page', path: '/docs/nope' }
			})
		]);
	});

	it('accepts links between the current docs and an archive, both ways', () => {
		const versions: DocsVersions = {
			current: { id: 'v2', label: 'v2' },
			archived: [{ id: 'v1', label: 'v1' }]
		};
		const pages = [
			page('intro', 'The [old intro](/docs/v1/intro), and [gone](/docs/v1/gone).'),
			page('v1/intro', 'The [new intro](/docs/intro).')
		];

		const found = brokenLinks(pages, { ...options, versions });

		expect(found).toEqual([
			expect.objectContaining({ file: fileOf('intro'), link: '/docs/v1/gone' })
		]);
	});

	it('sorts what it finds by page file, then line', () => {
		const pages = [
			page('b', '[x](/docs/b2)\n\n[x](/docs/b1)'),
			page('a', '[x](/docs/a1)')
		];

		const found = brokenLinks(pages, options);

		expect(found.map(({ file, line }) => [path.basename(path.dirname(file)), line])).toEqual([
			['a', 5],
			['b', 5],
			['b', 7]
		]);
	});

	it('reads pages with Windows line endings', () => {
		const source = '---\r\ntitle: Intro\r\n---\r\n\r\nText.\r\n\r\n[x](/docs/nope)\r\n';
		const found = brokenLinks([toPage(fileOf('intro'), source)], options);
		expect(found.map(({ line }) => line)).toEqual([7]);
	});

	it('works with the docs at the routes root', () => {
		const pages = [toPage(path.join(routesDir, 'intro', '+page.md'), '[x](/nope) [y](/intro)')];

		const found = brokenLinks(pages, { contentDir: routesDir, routesDir });

		expect(found.map(({ link }) => link)).toEqual(['/nope']);
	});
});
