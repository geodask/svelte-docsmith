import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { codeBlockRenderer } from './code-block.js';
import { brokenLinks, brokenLinksReport } from './links.js';
import { markdownCompiler } from './markdown.js';
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

		const found = brokenLinks([page('intro', body), page('theming', '## Tokens')], options);

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
		const pages = [page('b', '[x](/docs/b2)\n\n[x](/docs/b1)'), page('a', '[x](/docs/a1)')];

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

	it('checks raw <a> links like markdown links, in both quote styles, with their lines', () => {
		const body = [
			'Inline <a href="/docs/one">one</a> and <a class="x" href=\'/docs/two\'>two</a>.', // 5
			'',
			'A tag over <a', // 7
			'  title="a > b"',
			"  href='/docs/three'>three</a>.", // 9
			'',
			'<div>', // 11
			'  <p>A block of HTML.</p>',
			'  <A HREF="/docs/four">four</A>', // 13
			'</div>',
			'',
			'- an item with <a href="/docs/five">five</a>', // 16
			'',
			'<a href="/docs/setup">fine</a> <abbr title="/docs/nope">no link</abbr>' // 18
		].join('\n');

		const found = brokenLinks([page('intro', body), page('setup')], options);

		expect(found.map(({ line, link }) => `${line} ${link}`)).toEqual([
			'5 /docs/one',
			'5 /docs/two',
			'9 /docs/three',
			'13 /docs/four',
			'16 /docs/five'
		]);
		expect(found[0]).toEqual({
			file: fileOf('intro'),
			line: 5,
			link: '/docs/one',
			problem: { type: 'no-page', path: '/docs/one' }
		});
	});

	it('skips raw <a> hrefs that are Svelte expressions, and <a> that is not live markup', () => {
		const body = [
			'<a href={base}>expression</a> <a href="/docs/{slug}">interpolated</a>',
			'',
			'<a {href}>shorthand</a> <a title="href=\'/docs/nope\'">no href</a>',
			'',
			'Write `<a href="/docs/inline">` to link.',
			'',
			'```svelte',
			'<a href="/docs/fenced">x</a>',
			'```',
			'',
			'<!-- <a href="/docs/commented">x</a> -->',
			'',
			'<script>',
			'  const tag = \'<a href="/docs/scripted">\';',
			'</script>'
		].join('\n');

		expect(brokenLinks([page('intro', body)], options)).toEqual([]);
	});

	it('resolves relative links against the page URL, and reports them as written', () => {
		const body = [
			'[sibling](./theming) [child-free](theming) [up](../intro) [gone](./nope)',
			'',
			'<a href="../../outside">outside the docs</a> <a href="./nope-too">raw</a>'
		].join('\n');
		const pages = [page('guide/setup', body), page('guide/theming'), page('intro')];

		const found = brokenLinks(pages, options);

		// `/docs/guide/setup` is the page URL, so `./x` is a sibling of `setup`.
		expect(found.map(({ link, problem }) => ({ link, problem }))).toEqual([
			{ link: './nope', problem: { type: 'no-page', path: '/docs/guide/nope' } },
			{ link: './nope-too', problem: { type: 'no-page', path: '/docs/guide/nope-too' } }
		]);
	});

	it('accepts a trailing slash, a query and the agent markdown twin on a link to a page', () => {
		const body = [
			'[a](/docs/intro/) [b](/docs/intro?tab=svelte) [c](/docs/intro.md)',
			'',
			'[e](/docs/) [f](/docs.md) [g](./intro/) [h](/docs/nope/?tab=x)'
		].join('\n');

		const found = brokenLinks([page('', body), page('intro')], options);

		expect(found.map(({ link, problem }) => ({ link, problem }))).toEqual([
			{ link: '/docs/nope/?tab=x', problem: { type: 'no-page', path: '/docs/nope' } }
		]);
	});

	it('counts every +page route it is told of as a page, not only doc pages', () => {
		const body = '[playground](/docs/playground) [api](./api) [gone](/docs/gone)';
		const pageRoutes = [
			path.join(contentDir, 'playground', '+page.svelte'),
			path.join(contentDir, 'api', '+page.markdown')
		];

		const found = brokenLinks([page('intro', body)], { ...options, pageRoutes });

		expect(found.map(({ link }) => link)).toEqual(['/docs/gone']);
	});

	it("accepts any anchor on a +page route that is no doc page, since it can't read its anchors", () => {
		const pageRoutes = [path.join(contentDir, 'playground', '+page.svelte')];

		const found = brokenLinks([page('intro', '[x](/docs/playground#controls)')], {
			...options,
			pageRoutes
		});

		expect(found).toEqual([]);
	});

	it('works with the docs at the routes root', () => {
		const pages = [toPage(path.join(routesDir, 'intro', '+page.md'), '[x](/nope) [y](/intro)')];

		const found = brokenLinks(pages, { contentDir: routesDir, routesDir });

		expect(found.map(({ link }) => link)).toEqual(['/nope']);
	});
});

describe('brokenLinks: anchors', () => {
	/** The anchors the check says `target` has, read off a link to one it lacks. */
	function anchorsOf(target: SourcePage): unknown {
		const found = brokenLinks([page('intro', '[x](/docs/target#nope)'), target], options);
		expect(found).toHaveLength(1);
		return found[0].problem;
	}

	it('reports a fragment that is no anchor of the page it points at, with the anchors it has', () => {
		const pages = [
			page('intro', 'See [llms.txt](/docs/seo#llms-txt) and [sitemap](/docs/seo#sitemap).'),
			page('seo', '## Sitemap\n\n## llms.txt')
		];

		expect(brokenLinks(pages, options)).toEqual([
			{
				file: fileOf('intro'),
				line: 5,
				link: '/docs/seo#llms-txt',
				problem: {
					type: 'no-anchor',
					path: '/docs/seo',
					anchor: 'llms-txt',
					anchors: ['sitemap', 'llmstxt']
				}
			}
		]);
	});

	it('checks a same-page fragment against the page it is written on', () => {
		const body = '## Versions\n\nSee [versions](#versions) and [releases](#releases).';

		const found = brokenLinks([page('intro', body), page('other', '## Releases')], options);

		expect(found).toEqual([
			expect.objectContaining({
				link: '#releases',
				problem: {
					type: 'no-anchor',
					path: '/docs/intro',
					anchor: 'releases',
					anchors: ['versions']
				}
			})
		]);
	});

	it('counts headings of every level, not only the h2 and h3 of the table of contents', () => {
		const target = [
			'# One',
			'',
			'#### Four',
			'',
			'###### Six',
			'',
			'Setext',
			'======',
			'',
			'> ## Quoted',
			'',
			'- ### Listed'
		].join('\n');

		expect(anchorsOf(page('target', target))).toMatchObject({
			anchors: ['one', 'four', 'six', 'setext', 'quoted', 'listed']
		});
	});

	it('gives duplicate headings the suffixed ids the page renders', () => {
		const target = '## Options\n\n### Example\n\n## Example\n\n### Example';

		expect(anchorsOf(page('target', target))).toMatchObject({
			anchors: ['options', 'example', 'example-1', 'example-2']
		});
	});

	it('counts an id written in the markdown, in an HTML block or inline', () => {
		const target = [
			'<div id="block">',
			'',
			"Text with an <span id='inline'>inline</span> anchor and <a id=bare></a>.",
			'',
			'</div>',
			'',
			'<Callout data-id="not-an-id" id={dynamic} />'
		].join('\n');
		const links = '[a](/docs/target#block) [b](/docs/target#inline) [c](/docs/target#bare)';

		expect(brokenLinks([page('intro', links), page('target', target)], options)).toEqual([]);
		expect(anchorsOf(page('target', target))).toMatchObject({
			anchors: ['block', 'inline', 'bare']
		});
	});

	it('ignores headings and ids written in code', () => {
		const target = [
			'```md',
			'## Fenced',
			'<div id="fenced"></div>',
			'```',
			'',
			'Write `<a id="inline"></a>` for an anchor.',
			'',
			'## Real'
		].join('\n');

		expect(anchorsOf(page('target', target))).toMatchObject({ anchors: ['real'] });
	});

	it('accepts a percent-encoded fragment, an empty one and #top', () => {
		const body = '## Café\n\n[a](#caf%C3%A9) [b](#café) [c](/docs/intro#) [d](#top)';

		expect(brokenLinks([page('intro', body)], options)).toEqual([]);
	});

	it('reports a fragment on a page that does not exist as a missing page', () => {
		const found = brokenLinks([page('intro', '[x](/docs/nope#x)')], options);

		expect(found.map(({ problem }) => problem.type)).toEqual(['no-page']);
	});

	it('gives each anchor the id the compiled page renders, so the two cannot drift', async () => {
		// Every id the compiled page puts on a heading or carries from a hand-written
		// tag, in order, and no other, is an anchor of the page.
		const target = [
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
			'##### Example',
			'',
			'###### Example',
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
			'## Not a heading',
			'```'
		].join('\n');
		const source = `---\ntitle: Target\n---\n\n${target}\n`;
		const compiled = await markdownCompiler({}, codeBlockRenderer({}))(source, fileOf('target'));
		// The id of every tag in the compiled markup, `<Components.h2>` included.
		const rendered = [...compiled!.code.matchAll(/<[\w.]+(?:\s[^>]*?)?\sid="([^"]*)"/g)].map(
			(match) => match[1]
		);

		expect(rendered).toHaveLength(16);
		expect(anchorsOf(toPage(fileOf('target'), source))).toMatchObject({ anchors: rendered });
	});
});

describe('brokenLinksReport', () => {
	it('words a missing anchor with the anchors its page has', () => {
		const file = path.join(process.cwd(), 'src/routes/docs/intro/+page.md');

		const report = brokenLinksReport([
			{
				file,
				line: 7,
				link: '/docs/seo#llms-txt',
				problem: {
					type: 'no-anchor',
					path: '/docs/seo',
					anchor: 'llms-txt',
					anchors: ['sitemap', 'llmstxt']
				}
			},
			{
				file,
				line: 9,
				link: '#x',
				problem: { type: 'no-anchor', path: '/docs/intro', anchor: 'x', anchors: [] }
			}
		]);

		expect(report.split('\n').slice(1)).toEqual([
			'  src/routes/docs/intro/+page.md:7  /docs/seo#llms-txt  no anchor #llms-txt on /docs/seo (has: #sitemap, #llmstxt)',
			'  src/routes/docs/intro/+page.md:9  #x  no anchor #x on /docs/intro (has: none)'
		]);
	});
});
