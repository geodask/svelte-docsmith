import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { docPages } from './doc-pages.js';
import { resolveOptions, type DocsmithOptions } from './options.js';

// The doc pages of a `docsmith()` call, against a real docs root on disk and
// with no Vite: which files they are, that they are read once, and how each
// check reports. Which links are broken is tested against literal pages in
// `../links.test.ts`, and each check on its own beside its module.

let routesDir: string;

function writePage(relDir: string, frontmatter: string, body = '# body') {
	const dir = path.join(routesDir, relDir);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, '+page.md'), `---\n${frontmatter}\n---\n\n${body}\n`);
}

/** The doc pages under the fixture root, told whether Vite is building or serving. */
function pagesFor(command: 'build' | 'serve', options: Partial<DocsmithOptions> = {}) {
	const pages = docPages(
		resolveOptions({
			site: { title: 'Docs' },
			content: path.join(routesDir, 'docs'),
			routes: routesDir,
			...options
		})
	);
	pages.command(command);
	return pages;
}

afterEach(() => {
	if (routesDir) fs.rmSync(routesDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

const REPORT_LINE = /intro\/\+page\.md:5 {2}\/docs\/theeming {2}no page at \/docs\/theeming/;

describe('which files are doc pages', () => {
	it('is a +page file in an extension compiled as markdown: .md unless the author says', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const byDefault = pagesFor('build');
		expect(byDefault.isDocPage('/app/src/routes/docs/intro/+page.md')).toBe(true);
		expect(byDefault.isDocPage('/app/src/routes/docs/intro/+page.mdx')).toBe(false);
		expect(byDefault.isDocPage('/app/src/routes/docs/intro/+page.svelte')).toBe(false);
		expect(byDefault.isDocPage('/app/src/routes/docs/intro/notes.md')).toBe(false);

		const mdx = pagesFor('build', { markdown: { extensions: ['.md', '.mdx'] } });
		expect(mdx.isDocPage('/app/src/routes/docs/intro/+page.md')).toBe(true);
		expect(mdx.isDocPage('/app/src/routes/docs/intro/+page.mdx')).toBe(true);
	});

	// The rule the compiler follows, so a page is indexed exactly when it is compiled.
	it('reads the pages the compiler compiles, and no others', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		fs.mkdirSync(path.join(routesDir, 'docs', 'guide'), { recursive: true });
		fs.writeFileSync(
			path.join(routesDir, 'docs', 'guide', '+page.mdx'),
			'---\ntitle: Guide\n---\n'
		);
		const files = (options?: Partial<DocsmithOptions>) =>
			pagesFor('build', options)
				.read()
				.pages.map((page) => path.relative(routesDir, page.file))
				.sort();

		expect(files()).toEqual([path.join('docs', 'intro', '+page.md')]);
		expect(files({ markdown: { extensions: ['.md', '.mdx'] } })).toEqual([
			path.join('docs', 'guide', '+page.mdx'),
			path.join('docs', 'intro', '+page.md')
		]);
		expect(files({ markdown: { extensions: ['.mdx'] } })).toEqual([
			path.join('docs', 'guide', '+page.mdx')
		]);
	});
});

describe('reading the doc pages', () => {
	it('reads each page once, however many ask', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		const intro = path.join(routesDir, 'docs', 'intro', '+page.md');
		const pages = pagesFor('build');
		const readFile = vi.spyOn(fs, 'readFileSync');

		const first = pages.read();
		expect(pages.read()).toBe(first);
		expect(await pages.sound()).toBe(first);
		expect(await pages.sound()).toBe(first);

		expect(readFile.mock.calls.filter(([file]) => file === intro)).toHaveLength(1);
	});

	it('reads again after a change, and says whether a doc page changed', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		const pages = pagesFor('serve', { links: { broken: 'ignore' } });
		expect(pages.read().pages).toHaveLength(1);

		writePage('docs/setup', 'title: Setup');
		expect(pages.read().pages).toHaveLength(1);
		expect(pages.changed(path.join(routesDir, 'docs', 'setup', '+page.md'))).toBe(true);
		expect(pages.read().pages).toHaveLength(2);

		expect(pages.changed(path.join(routesDir, 'docs', 'notes.txt'))).toBe(false);
		expect(pages.changed(path.join(routesDir, 'docs', 'playground', '+page.svelte'))).toBe(false);
	});

	it('tells a missing docs root from an empty one', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		expect(pagesFor('build').read()).toEqual({ pages: [], exists: false });

		fs.mkdirSync(path.join(routesDir, 'docs'));
		expect(pagesFor('build').read()).toEqual({ pages: [], exists: true });
	});

	it('throws on frontmatter that is not YAML, and reads again once it is', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: "unterminated');
		const pages = pagesFor('build');

		expect(() => pages.read()).toThrow(/invalid YAML frontmatter in .*intro.*\+page\.md/s);

		// No change reported in between: a failed read is never kept.
		writePage('docs/intro', 'title: Intro');
		expect(pages.read().pages).toHaveLength(1);
	});
});

describe('sound pages', () => {
	it('checks the versions against the archives before reading a page', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		// Both wrong: the version check has to be the one that speaks.
		writePage('docs/intro', 'title: "unterminated');
		const pages = pagesFor('build', {
			versions: { current: { id: 'v2', label: 'v2' }, archived: [{ id: 'v1', label: 'v1' }] }
		});

		await expect(pages.sound()).rejects.toThrow(/No directory for `v1`/);
	});

	it('checks the outside paths before the frontmatter, and the frontmatter before the links', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\nordr: 2', 'See [theming](/docs/theeming).');
		writePage('docs/api/users', 'title: Users');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const schema: DocsmithOptions['schema'] = {
			'~standard': {
				version: 1,
				vendor: 'test',
				validate: (value) =>
					'ordr' in (value as object)
						? { issues: [{ message: 'Unrecognized key: "ordr"' }] }
						: { value }
			}
		};

		await expect(
			pagesFor('build', { schema, links: { outside: ['/docs/api'] } }).sound()
		).rejects.toThrow(/outside path '\/docs\/api'/);
		await expect(pagesFor('build', { schema }).sound()).rejects.toThrow(/invalid frontmatter/);
		// Neither got as far as the links.
		expect(error).not.toHaveBeenCalled();
	});

	it('checks once per read, so a typo is warned about once', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\nordr: 2');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const pages = pagesFor('serve', { links: { broken: 'ignore' } });

		await pages.sound();
		await pages.sound();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('ordr: did you mean `order`?'));

		pages.changed(path.join(routesDir, 'docs', 'intro', '+page.md'));
		await pages.sound();
		expect(warn).toHaveBeenCalledTimes(2);
	});
});

describe('broken links in a build', () => {
	it('fails after printing every broken link, by default', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		writePage('docs/setup', 'title: Setup', '[a](/docs/intro) [b](/docs/nope)');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(pagesFor('build').sound()).rejects.toThrow(
			/2 broken links.*links: \{ broken: 'warn' \}/s
		);

		// One report with every link in it, sorted by page file.
		expect(error).toHaveBeenCalledTimes(1);
		const report = String(error.mock.calls[0][0]);
		expect(report).toMatch(/^\[svelte-docsmith\] 2 broken links in doc pages\n/);
		expect(report).toMatch(REPORT_LINE);
		expect(report).toMatch(/setup\/\+page\.md:5 {2}\/docs\/nope {2}no page at \/docs\/nope/);
		expect(report.indexOf('intro/+page.md')).toBeLessThan(report.indexOf('setup/+page.md'));
	});

	it('prints the report and builds under `warn`', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const { pages } = await pagesFor('build', { links: { broken: 'warn' } }).sound();

		expect(pages).toHaveLength(1);
		expect(warn).toHaveBeenCalledWith(expect.stringMatching(REPORT_LINE));
	});

	it('skips the check under `ignore`', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		await pagesFor('build', { links: { broken: 'ignore' } }).sound();

		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
	});

	it('builds quietly when no link is broken', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [setup](/docs/setup).');
		writePage('docs/setup', 'title: Setup');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		await pagesFor('build').sound();

		expect(error).not.toHaveBeenCalled();
	});

	it('counts any +page route under the docs root as a page, Svelte and markdown alike', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const route = (relDir: string, name: string) => {
			fs.mkdirSync(path.join(routesDir, relDir), { recursive: true });
			fs.writeFileSync(path.join(routesDir, relDir, name), '<h1>A route</h1>\n');
		};
		route('docs/playground', '+page.svelte');
		route('docs/api', '+page.markdown');
		route('docs/data', '+page.server.ts');
		writePage(
			'docs/intro',
			'title: Intro',
			'[a](/docs/playground) [b](/docs/api) [c](/docs/data) [d](./playground/)'
		);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		// A load module alone renders nothing, so it isn't a page.
		await expect(
			pagesFor('build', { markdown: { extensions: ['.md', '.markdown'] } }).sound()
		).rejects.toThrow(/1 broken link/);
		const report = String(error.mock.calls[0][0]);
		expect(report).toMatch(/intro\/\+page\.md:5 {2}\/docs\/data {2}no page at \/docs\/data/);
	});
});

describe('broken links in dev', () => {
	it('warns at startup and as pages change, never throwing or repeating itself', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		const intro = path.join(routesDir, 'docs', 'intro', '+page.md');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const dev = pagesFor('serve');

		dev.devStarted();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenLastCalledWith(expect.stringMatching(REPORT_LINE));

		// The pages are sound for the content index, even under the default `error`.
		expect((await dev.sound()).pages).toHaveLength(1);

		// A save that leaves the same links broken says nothing new, even when
		// the link moved down a line.
		writePage('docs/intro', 'title: Intro', 'Intro.\nSee [theming](/docs/theeming).');
		dev.changed(intro);
		expect(warn).toHaveBeenCalledTimes(1);

		// A new broken link warns again, with the whole set.
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming) and [x](/docs/x).');
		dev.changed(intro);
		expect(warn).toHaveBeenCalledTimes(2);
		expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('2 broken links'));

		// Adding the pages they point at fixes them, and says so once.
		writePage('docs/theeming', 'title: Theeming');
		writePage('docs/x', 'title: X');
		dev.changed(path.join(routesDir, 'docs', 'x', '+page.md'));
		expect(warn).toHaveBeenCalledTimes(2);
		expect(info).toHaveBeenCalledTimes(1);
		expect(info).toHaveBeenCalledWith(expect.stringContaining('no broken links left'));

		// Removing one breaks its link again.
		fs.rmSync(path.join(routesDir, 'docs', 'x'), { recursive: true });
		dev.changed(path.join(routesDir, 'docs', 'x', '+page.md'));
		expect(warn).toHaveBeenCalledTimes(3);
		expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('/docs/x'));
	});

	it('re-checks links when a Svelte page route comes or goes', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'Try the [playground](/docs/playground).');
		const playground = path.join(routesDir, 'docs', 'playground', '+page.svelte');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const dev = pagesFor('serve');

		dev.devStarted();
		expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('/docs/playground'));

		fs.mkdirSync(path.dirname(playground), { recursive: true });
		fs.writeFileSync(playground, '<h1>Playground</h1>\n');
		dev.changed(playground);
		expect(info).toHaveBeenCalledWith(expect.stringContaining('no broken links left'));
	});

	it('keeps quiet while a page has half-typed frontmatter', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: "unterminated');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const dev = pagesFor('serve');

		expect(() => dev.devStarted()).not.toThrow();
		expect(() => dev.changed(path.join(routesDir, 'docs', 'intro', '+page.md'))).not.toThrow();
		// The content index reports it with the page's name; the check waits quietly.
		expect(error).not.toHaveBeenCalled();
	});

	it('prints any other failure of the check, rather than hiding it', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		const intro = path.join(routesDir, 'docs', 'intro', '+page.md');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const readFileSync = fs.readFileSync;
		vi.spyOn(fs, 'readFileSync').mockImplementation(((file: string, ...rest) => {
			if (file === intro) throw new Error('EIO: i/o error, read');
			return (readFileSync as (...args: unknown[]) => unknown)(file, ...rest);
		}) as typeof fs.readFileSync);
		const dev = pagesFor('serve');

		expect(() => dev.devStarted()).not.toThrow();
		expect(() => dev.changed(intro)).not.toThrow();

		expect(error).toHaveBeenCalledTimes(2);
		expect(error).toHaveBeenLastCalledWith(
			expect.stringMatching(/^\[svelte-docsmith\] .*\n.*EIO: i\/o error, read/s)
		);
	});

	it('stays quiet under `ignore`', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		pagesFor('serve', { links: { broken: 'ignore' } }).devStarted();

		expect(warn).not.toHaveBeenCalled();
	});
});

describe('outside paths', () => {
	it('lets links to an outside path through, even under the docs base', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', '[a](/docs/api/users) [b](/docs/api) [c](/relative)');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		// A trailing slash on a prefix is dropped, so `/docs/api` itself is covered.
		await pagesFor('build', { links: { outside: ['/docs/api/', '/relative'] } }).sound();

		expect(error).not.toHaveBeenCalled();
	});

	it('fails on a doc page under an outside path, naming the page and the prefix', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		writePage('docs/api/users', 'title: Users');

		// Even with the link check off: the config contradicts itself either way.
		const pages = pagesFor('build', { links: { broken: 'ignore', outside: ['/docs/api'] } });

		await expect(pages.sound()).rejects.toThrow(
			/docs\/api\/users\/\+page\.md.*\/docs\/api\/users.*outside path '\/docs\/api'/s
		);
	});

	it('reports a doc page under an outside path at dev startup, without throwing', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		writePage('docs/api/users', 'title: Users');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Even with the link check off: the config contradicts itself either way.
		const dev = pagesFor('serve', { links: { broken: 'ignore', outside: ['/docs/api'] } });

		expect(() => dev.devStarted()).not.toThrow();
		expect(error).toHaveBeenCalledTimes(1);
		expect(error).toHaveBeenCalledWith(
			expect.stringMatching(
				/docs\/api\/users\/\+page\.md.*\/docs\/api\/users.*outside path '\/docs\/api'/s
			)
		);
	});
});
