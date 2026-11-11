import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { docsmith, type DocsmithOptions } from './index.js';
import type { Plugin } from 'vite';

// Plugin hooks are typed as ObjectHook unions; in these plugins they are plain
// functions, so cast to call them directly with a fake Rollup plugin context.
type ResolveId = (this: unknown, id: string, importer?: string) => Promise<string | undefined>;
type Load = (this: unknown, id: string) => Promise<string | undefined> | string | undefined;

/** `docsmith()`'s options, with a site filled in when the test doesn't care which. */
type TestOptions = Omit<DocsmithOptions, 'site'> & Partial<Pick<DocsmithOptions, 'site'>>;

const SITE = { title: 'Docs' };

const pluginNamed = (name: string, options: TestOptions = {}): Plugin =>
	docsmith({ site: SITE, ...options }).find((p) => p.name === name) as Plugin;

// --- doc imports ----------------------------------------------------------
//
// Each kind's page side is tested in `doc-imports/doc-imports.test.ts`; this
// proves `docsmith()` serves them.

describe('docsmith() doc imports', () => {
	it('serves ?source and ?props imports through one plugin', async () => {
		const plugin = pluginNamed('docsmith-doc-imports');
		const resolveId = plugin.resolveId as unknown as ResolveId;
		const resolve = vi.fn().mockResolvedValue({ id: '/abs/Foo.svelte' });
		expect(await resolveId.call({ resolve }, 'Foo.svelte?source', '/page')).toBeDefined();
		expect(await resolveId.call({ resolve }, 'Foo.svelte?props', '/page')).toBeDefined();
		expect(await resolveId.call({ resolve }, 'Foo.svelte', '/page')).toBeUndefined();
	});
});

// --- content index -------------------------------------------------------
//
// These drive the plugin against a real docs root on disk. That is the point:
// the index builders are unit-tested against in-memory pages in
// `collect.test.ts`, so this file is the only thing proving the plugin actually
// reads the filesystem it is pointed at.

let routesDir: string;

function writePage(relDir: string, frontmatter: string, body = '# body') {
	const dir = path.join(routesDir, relDir);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, '+page.md'), `---\n${frontmatter}\n---\n\n${body}\n`);
}

/** Write a file under the fixture routes root and return its absolute path. */
function writeFile(rel: string, contents: string) {
	const file = path.join(routesDir, rel);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, contents);
	return file;
}

afterEach(() => {
	if (routesDir) fs.rmSync(routesDir, { recursive: true, force: true });
});

describe('docsmith() content plugin', () => {
	// What each generated module holds is tested as data in
	// `generated-modules.test.ts`. These prove the plugin serves that set.
	it('resolves the generated module specifiers to virtual modules', () => {
		const plugin = pluginNamed('docsmith-content');
		const resolveId = plugin.resolveId as unknown as (id: string) => string | undefined;
		expect(resolveId.call({}, 'svelte-docsmith/content')).toBe('\0svelte-docsmith:content');
		expect(resolveId.call({}, 'svelte-docsmith/search')).toBe('\0svelte-docsmith:search');
		expect(resolveId.call({}, 'svelte-docsmith/llms')).toBe('\0svelte-docsmith:llms');
		expect(resolveId.call({}, 'svelte-docsmith/site')).toBe('\0svelte-docsmith:site');
		expect(resolveId.call({}, 'something-else')).toBeUndefined();
	});

	it('loads a generated module as JavaScript, through the plugin context', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writeFile('docs/examples/counter.svelte', '<p>counter</p>\n');
		const page = path.join(routesDir, 'docs', 'examples', '+page.md');
		writePage(
			'docs/examples',
			'title: Examples',
			"<script>\n\timport counter from './counter.svelte?source';\n</script>\n\n<LiveExample source={counter} />"
		);
		const plugin = pluginNamed('docsmith-content', {
			content: path.join(routesDir, 'docs'),
			routes: routesDir
		});
		const example = path.join(routesDir, 'docs', 'examples', 'counter.svelte');
		const ctx = {
			addWatchFile: vi.fn(),
			warn: vi.fn(),
			resolve: vi.fn().mockResolvedValue({ id: example })
		};

		const out = await (plugin.load as unknown as Load).call(ctx, '\0svelte-docsmith:llms');

		expect(out).toMatch(/^export const docs = \[\{.*"path":"\/docs\/examples".*\}\];\n$/);
		expect(out).toContain('<p>counter</p>');
		// The page's imports resolve as Vite resolves them, past this plugin.
		expect(ctx.resolve).toHaveBeenCalledWith('./counter.svelte', page, { skipSelf: true });
		expect(ctx.addWatchFile).toHaveBeenCalledWith(page);
		expect(ctx.addWatchFile).toHaveBeenCalledWith(example);
		expect(await (plugin.load as unknown as Load).call(ctx, '/some/file.ts')).toBeUndefined();
	});

	it('never loads TypeScript for a site without props imports', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'No props tables here.');
		const loadedTypeScript = vi.fn();
		vi.resetModules();
		vi.doMock('typescript', () => {
			loadedTypeScript();
			throw new Error('TypeScript should not load');
		});
		try {
			const { docsmith: fresh } = await import('./index.js');
			const plugins = fresh({
				site: SITE,
				content: path.join(routesDir, 'docs'),
				routes: routesDir,
				changelog: false
			});
			for (const plugin of plugins) {
				(plugin.configResolved as ((c: { root: string }) => void) | undefined)?.({
					root: routesDir
				});
			}
			const ctx = { addWatchFile: vi.fn(), warn: vi.fn() };
			for (const plugin of plugins) {
				for (const id of [
					'\0svelte-docsmith:content',
					'\0svelte-docsmith:search',
					'\0svelte-docsmith:llms',
					'\0svelte-docsmith:changelog'
				]) {
					await (plugin.load as unknown as Load | undefined)?.call(ctx, id);
				}
			}
		} finally {
			vi.doUnmock('typescript');
		}
		expect(loadedTypeScript).not.toHaveBeenCalled();
	});

	it('invalidates and full-reloads only when a page file changes', () => {
		const handlers: Record<string, (file: string) => void> = {};
		const mod = { id: '\0svelte-docsmith:content' };
		const server = {
			watcher: {
				add: vi.fn(),
				on: vi.fn((event: string, cb: (file: string) => void) => {
					handlers[event] = cb;
				})
			},
			moduleGraph: {
				getModuleById: vi.fn(() => mod),
				invalidateModule: vi.fn()
			},
			ws: { send: vi.fn() }
		};

		const plugin = pluginNamed('docsmith-content');
		(plugin.configureServer as unknown as (s: typeof server) => void).call({}, server);

		expect(server.watcher.add).toHaveBeenCalled();

		// A non-page change is ignored.
		handlers.change('src/routes/docs/notes.txt');
		expect(server.moduleGraph.invalidateModule).not.toHaveBeenCalled();

		// A page change invalidates the virtual module and triggers a reload.
		handlers.change('src/routes/docs/intro/+page.md');
		expect(server.moduleGraph.invalidateModule).toHaveBeenCalledWith(mod);
		expect(server.ws.send).toHaveBeenCalledWith({ type: 'full-reload' });
	});

	it('does nothing on change when the virtual module is not in the graph', () => {
		const handlers: Record<string, (file: string) => void> = {};
		const server = {
			watcher: {
				add: vi.fn(),
				on: vi.fn((e: string, cb: (f: string) => void) => (handlers[e] = cb))
			},
			moduleGraph: { getModuleById: vi.fn(() => undefined), invalidateModule: vi.fn() },
			ws: { send: vi.fn() }
		};

		const plugin = pluginNamed('docsmith-content');
		(plugin.configureServer as unknown as (s: typeof server) => void).call({}, server);

		handlers.add('src/routes/docs/new/+page.md');
		expect(server.moduleGraph.invalidateModule).not.toHaveBeenCalled();
		expect(server.ws.send).not.toHaveBeenCalled();
	});
});

// --- site config, options, markdown ---------------------------------------

describe('docsmith() site config', () => {
	it('fails at startup without a site title, before anything is served', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => docsmith({})).toThrow(/needs a `site` object/);
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => docsmith({ site: {} })).toThrow(/site\.title is required/);
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => docsmith()).toThrow(/needs options with a `site`/);
	});

	it('fails at startup on a site value the browser would not receive as written', () => {
		expect(() =>
			// @ts-expect-error — a function is not plain data
			docsmith({ site: { title: 'Docs', footer: { copyright: () => '©' } } })
		).toThrow(/site\.footer\.copyright must be a string/);
	});

	it('points options that moved at their new home', () => {
		// @ts-expect-error — the old option is gone from the type
		expect(() => docsmith({ site: SITE, changelogPath: '/releases' })).toThrow(
			/changelogPath \}\) moved to `changelog: \{ path \}`/
		);
		// @ts-expect-error — the old string form is gone from the type
		expect(() => docsmith({ site: SITE, changelog: 'CHANGELOG.md' })).toThrow(
			/changelog: \{ file: "CHANGELOG.md" \}/
		);
	});

	it('carries its options as written, for the archive CLI to read', () => {
		const options = {
			site: SITE,
			content: 'docs',
			versions: { current: { id: 'v2', label: 'v2.x' } }
		};
		const plugin = docsmith(options).find((p) => p.name === 'docsmith-content');
		expect((plugin?.api as { docsmith: unknown }).docsmith).toBe(options);
	});
});

describe('docsmith() reader events', () => {
	it('fails at startup on a handler file that does not exist, naming it', () => {
		expect(() => docsmith({ site: SITE, readerEvents: './src/lib/nope.ts' })).toThrow(
			/reader event handler not found: .*src[\\/]lib[\\/]nope\.ts/
		);
	});

	it('fails at startup on a readerEvents that is not a path', () => {
		// @ts-expect-error — exercising the runtime guard for untyped callers
		expect(() => docsmith({ site: SITE, readerEvents: () => {} })).toThrow(
			/readerEvents \}\) takes a path to your handler module/
		);
	});
});

describe('docsmith() markdown pages', () => {
	type Transform = { handler: (code: string, id: string) => Promise<{ code: string } | undefined> };
	const transform = (options: TestOptions = {}) =>
		pluginNamed('docsmith-markdown', options).transform as unknown as Transform;

	it('compiles a markdown page into Svelte markup, ahead of vite-plugin-svelte', async () => {
		const { handler, order } = transform() as Transform & { order: string };
		expect(order).toBe('pre');
		const out = await handler('## Hello\n\n```js\nconst a = 1;\n```', '/app/src/routes/x/+page.md');
		expect(out?.code).toContain('id="hello"');
		expect(out?.code).toContain('<Components.pre language={"js"}>');
	});

	it('leaves other files and non-page requests of a markdown file alone', async () => {
		const { handler } = transform();
		expect(await handler('<p>hi</p>', '/app/src/x.svelte')).toBeUndefined();
		expect(await handler('# raw', '/app/README.md?raw')).toBeUndefined();
		expect(await handler('p{}', '/app/x/+page.md?svelte&type=style&lang.css')).toBeUndefined();
	});

	it('still compiles a page requested with a cache-busting timestamp', async () => {
		const out = await transform().handler('# Hi', '/app/x/+page.md?t=123');
		expect(out?.code).toContain('Hi');
	});

	it('compiles the extensions the markdown options name', async () => {
		const { handler } = transform({ markdown: { extensions: ['.svx'] } });
		expect(await handler('# Hi', '/app/x/+page.md')).toBeUndefined();
		expect((await handler('# Hi', '/app/x/+page.svx'))?.code).toContain('Hi');
	});

	it('draws fences with the code theme and line numbers set once for the site', async () => {
		const { handler } = transform({
			codeTheme: { light: 'min-light', dark: 'min-dark' },
			markdown: { lineNumbers: true }
		});
		const out = await handler('```js\nconst a = 1;\n```', '/app/x/+page.md');
		// min-light's keyword colour; github-light's is #D73A49.
		expect(out?.code).toContain('#D32F2F');
		expect(out?.code).toContain('lineNumbers');
	});

	it('still reads the deprecated `themes`, and says it was renamed', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			const { handler } = transform({ themes: { light: 'min-light', dark: 'min-dark' } });
			const out = await handler('```js\nconst a = 1;\n```', '/app/x/+page.md');
			expect(out?.code).toContain('#D32F2F');
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('renamed to `codeTheme`'));
		} finally {
			warn.mockRestore();
		}
	});

	it('refuses `themes` and `codeTheme` together', () => {
		const pair = { light: 'min-light', dark: 'min-dark' };
		expect(() => docsmith({ site: SITE, themes: pair, codeTheme: pair })).toThrow(
			/both `themes` and `codeTheme`/
		);
	});

	it('warns when SvelteKit does not compile the markdown extensions', () => {
		const plugin = pluginNamed('docsmith-markdown');
		const warn = vi.fn();
		const configResolved = plugin.configResolved as unknown as (config: unknown) => void;
		const svelteWith = (extensions: string[]) => ({
			name: 'vite-plugin-svelte:config',
			api: { options: { extensions } }
		});
		configResolved({ plugins: [svelteWith(['.svelte'])], logger: { warn } });
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("extensions: ['.svelte', '.md']"));
		warn.mockClear();
		configResolved({ plugins: [svelteWith(['.svelte', '.md'])], logger: { warn } });
		expect(warn).not.toHaveBeenCalled();
	});
});

// --- broken links -----------------------------------------------------------
//
// Which links are broken is tested against literal pages in `../links.test.ts`.
// These prove how the plugin reports them: once per build, failing it under
// `error`, and as a dev warning that follows the pages as they change.

/** The content plugin pointed at the fixture root, told whether it is building or serving. */
function contentPlugin(
	command: 'build' | 'serve',
	options: Omit<TestOptions, 'content' | 'routes'> = {}
) {
	const plugin = pluginNamed('docsmith-content', {
		content: path.join(routesDir, 'docs'),
		routes: routesDir,
		...options
	});
	(plugin.configResolved as unknown as (config: { command: string }) => void)({ command });
	const load = () =>
		(plugin.load as unknown as Load).call(
			{ addWatchFile: vi.fn() },
			'\0svelte-docsmith:content'
		) as Promise<string>;
	const configureServer = (server: ReturnType<typeof fakeServer>) =>
		(plugin.configureServer as unknown as (s: typeof server) => void).call({}, server);
	return { load, configureServer };
}

/** A dev server double that keeps the watcher's handlers, so a test can fire them. */
function fakeServer() {
	const handlers: Record<string, (file: string) => void> = {};
	return {
		handlers,
		watcher: {
			add: vi.fn(),
			on: vi.fn((event: string, cb: (file: string) => void) => (handlers[event] = cb))
		},
		moduleGraph: { getModuleById: vi.fn(() => undefined), invalidateModule: vi.fn() },
		ws: { send: vi.fn() }
	};
}

const REPORT_LINE = /intro\/\+page\.md:5 {2}\/docs\/theeming {2}no page at \/docs\/theeming/;

describe('docsmith() broken links', () => {
	it('fails `vite build` after printing every broken link, by default', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		writePage('docs/setup', 'title: Setup', '[a](/docs/intro) [b](/docs/nope)');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(contentPlugin('build').load()).rejects.toThrow(
			/2 broken links.*links: \{ broken: 'warn' \}/s
		);

		// One report with every link in it, sorted by page file.
		expect(error).toHaveBeenCalledTimes(1);
		const report = String(error.mock.calls[0][0]);
		expect(report).toMatch(/^\[svelte-docsmith\] 2 broken links in doc pages\n/);
		expect(report).toMatch(REPORT_LINE);
		expect(report).toMatch(/setup\/\+page\.md:5 {2}\/docs\/nope {2}no page at \/docs\/nope/);
		expect(report.indexOf('intro/+page.md')).toBeLessThan(report.indexOf('setup/+page.md'));
		error.mockRestore();
	});

	it('prints the report and builds under `warn`', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const out = await contentPlugin('build', { links: { broken: 'warn' } }).load();

		expect(out).toContain('"path":"/docs/intro"');
		expect(warn).toHaveBeenCalledWith(expect.stringMatching(REPORT_LINE));
		warn.mockRestore();
	});

	it('skips the check under `ignore`', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		await contentPlugin('build', { links: { broken: 'ignore' } }).load();

		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		warn.mockRestore();
		error.mockRestore();
	});

	it('builds quietly when no link is broken', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [setup](/docs/setup).');
		writePage('docs/setup', 'title: Setup');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		await contentPlugin('build').load();

		expect(error).not.toHaveBeenCalled();
		error.mockRestore();
	});

	it('warns in dev at startup and as pages change, never throwing or repeating itself', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		const intro = path.join(routesDir, 'docs', 'intro', '+page.md');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const dev = contentPlugin('serve');
		const server = fakeServer();

		dev.configureServer(server);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenLastCalledWith(expect.stringMatching(REPORT_LINE));

		// Serving the index never throws, even under the default `error`.
		await expect(dev.load()).resolves.toContain('"path":"/docs/intro"');

		// A save that leaves the same links broken says nothing new, even when
		// the link moved down a line.
		writePage('docs/intro', 'title: Intro', 'Intro.\nSee [theming](/docs/theeming).');
		server.handlers.change(intro);
		expect(warn).toHaveBeenCalledTimes(1);

		// A new broken link warns again, with the whole set.
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming) and [x](/docs/x).');
		server.handlers.change(intro);
		expect(warn).toHaveBeenCalledTimes(2);
		expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('2 broken links'));

		// Adding the pages they point at fixes them, and says so once.
		writePage('docs/theeming', 'title: Theeming');
		writePage('docs/x', 'title: X');
		server.handlers.add(path.join(routesDir, 'docs', 'x', '+page.md'));
		expect(warn).toHaveBeenCalledTimes(2);
		expect(info).toHaveBeenCalledTimes(1);
		expect(info).toHaveBeenCalledWith(expect.stringContaining('no broken links left'));

		// Removing one breaks its link again.
		fs.rmSync(path.join(routesDir, 'docs', 'x'), { recursive: true });
		server.handlers.unlink(path.join(routesDir, 'docs', 'x', '+page.md'));
		expect(warn).toHaveBeenCalledTimes(3);
		expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('/docs/x'));

		warn.mockRestore();
		info.mockRestore();
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
			contentPlugin('build', { markdown: { extensions: ['.md', '.markdown'] } }).load()
		).rejects.toThrow(/1 broken link/);
		const report = String(error.mock.calls[0][0]);
		expect(report).toMatch(/intro\/\+page\.md:5 {2}\/docs\/data {2}no page at \/docs\/data/);
		error.mockRestore();
	});

	it('re-checks links in dev when a Svelte page route comes or goes', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'Try the [playground](/docs/playground).');
		const playground = path.join(routesDir, 'docs', 'playground', '+page.svelte');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const server = fakeServer();

		contentPlugin('serve').configureServer(server);
		expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('/docs/playground'));

		fs.mkdirSync(path.dirname(playground), { recursive: true });
		fs.writeFileSync(playground, '<h1>Playground</h1>\n');
		server.handlers.add(playground);
		expect(info).toHaveBeenCalledWith(expect.stringContaining('no broken links left'));

		warn.mockRestore();
		info.mockRestore();
	});

	it('keeps the dev server up while a page has half-typed frontmatter', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: "unterminated');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const dev = contentPlugin('serve');
		const server = fakeServer();

		expect(() => dev.configureServer(server)).not.toThrow();
		expect(() =>
			server.handlers.change(path.join(routesDir, 'docs', 'intro', '+page.md'))
		).not.toThrow();
		// The content index reports it with the page's name; the check waits quietly.
		expect(error).not.toHaveBeenCalled();
		error.mockRestore();
	});

	it('prints any other failure of the dev check, rather than hiding it', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		const intro = path.join(routesDir, 'docs', 'intro', '+page.md');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const readFileSync = fs.readFileSync;
		const read = vi.spyOn(fs, 'readFileSync').mockImplementation(((file: string, ...rest) => {
			if (file === intro) throw new Error('EIO: i/o error, read');
			return (readFileSync as (...args: unknown[]) => unknown)(file, ...rest);
		}) as typeof fs.readFileSync);
		const server = fakeServer();

		expect(() => contentPlugin('serve').configureServer(server)).not.toThrow();
		expect(() => server.handlers.change(intro)).not.toThrow();

		expect(error).toHaveBeenCalledTimes(2);
		expect(error).toHaveBeenLastCalledWith(
			expect.stringMatching(/^\[svelte-docsmith\] .*\n.*EIO: i\/o error, read/s)
		);
		read.mockRestore();
		error.mockRestore();
	});

	it('reports a doc page under an outside path at dev startup, without throwing', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		writePage('docs/api/users', 'title: Users');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Even with the check off: the config contradicts itself either way.
		const dev = contentPlugin('serve', { links: { broken: 'ignore', outside: ['/docs/api'] } });

		expect(() => dev.configureServer(fakeServer())).not.toThrow();
		expect(error).toHaveBeenCalledTimes(1);
		expect(error).toHaveBeenCalledWith(
			expect.stringMatching(
				/docs\/api\/users\/\+page\.md.*\/docs\/api\/users.*outside path '\/docs\/api'/s
			)
		);
		error.mockRestore();
	});

	it('stays quiet in dev under `ignore`', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		contentPlugin('serve', { links: { broken: 'ignore' } }).configureServer(fakeServer());

		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it('fails at startup on a `broken` value it does not know, naming the ones it does', () => {
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			docsmith({ site: SITE, links: { broken: 'erorr' } })
		).toThrow(/links\.broken must be 'error', 'warn' or 'ignore', got "erorr"/);
		expect(() =>
			// @ts-expect-error — exercising the runtime guard for untyped callers
			docsmith({ site: SITE, links: 'warn' })
		).toThrow(/docsmith\(\{ links \}\) takes an object/);
	});
});

// --- outside paths ------------------------------------------------------------
//
// Matching is tested in `core/outside-path.test.ts`, the check in
// `../links.test.ts` and `rel="external"` in `../markdown.test.ts`. These prove
// the plugin wires `links.outside` through to each, and checks it at startup.

describe('docsmith() outside paths', () => {
	it('builds with links to an outside path, even under the docs base', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', '[a](/docs/api/users) [b](/docs/api) [c](/relative)');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		// A trailing slash on a prefix is dropped, so `/docs/api` itself is covered.
		await contentPlugin('build', { links: { outside: ['/docs/api/', '/relative'] } }).load();

		expect(error).not.toHaveBeenCalled();
		error.mockRestore();
	});

	it('fails at startup on a doc page under an outside path, naming the page and the prefix', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		writePage('docs/api/users', 'title: Users');

		// Even with the check off: the config contradicts itself either way.
		const plugin = contentPlugin('build', { links: { broken: 'ignore', outside: ['/docs/api'] } });

		await expect(plugin.load()).rejects.toThrow(
			/docs\/api\/users\/\+page\.md.*\/docs\/api\/users.*outside path '\/docs\/api'/s
		);
	});

	it('fails at startup on outside paths that are not an array of site-absolute paths', () => {
		const withOutside = (outside: unknown) => () =>
			docsmith({ site: SITE, links: { outside: outside as string[] } });

		expect(withOutside('/relative')).toThrow(/links\.outside must be an array/);
		expect(withOutside([42])).toThrow(/links\.outside.*42/);
		expect(withOutside(['relative'])).toThrow(/links\.outside.*must start with '\/'.*"relative"/);
		expect(withOutside(['//cdn.x.dev'])).toThrow(/links\.outside.*"\/\/cdn\.x\.dev"/);
		expect(withOutside(['/relative', '/api/'])).not.toThrow();
	});

	it('marks links to outside paths rel="external" in compiled pages', async () => {
		type Transform = { handler: (code: string, id: string) => Promise<{ code: string }> };
		const plugin = pluginNamed('docsmith-markdown', {
			routes: '/app/src/routes',
			links: { outside: ['/relative/'] }
		});
		const { handler } = plugin.transform as unknown as Transform;

		const out = await handler(
			'[a](/relative/x) <a href="/relative">b</a> [c](/docs)',
			'/app/src/routes/docs/+page.md'
		);

		expect(out.code).toContain('<a href="/relative/x" rel="external">');
		expect(out.code).toContain('<a href="/relative" rel="external">');
		expect(out.code).toContain('<a href="/docs">');
	});
});
