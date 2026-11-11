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

// --- doc pages ---------------------------------------------------------------
//
// Reading and checking the doc pages is tested against a docs root, without
// Vite, in `doc-pages.test.ts`. These prove the plugin hands Vite's hooks on:
// the command, the dev server's start and its watcher.

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

describe('docsmith() doc pages', () => {
	it('fails `vite build` on a broken link, and serves the content index in `vite dev`', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(contentPlugin('build').load()).rejects.toThrow(/1 broken link/);
		await expect(contentPlugin('serve').load()).resolves.toContain('"path":"/docs/intro"');
		error.mockRestore();
	});

	it('checks the pages as the dev server starts, and again as the watcher reports changes', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'See [theming](/docs/theeming).');
		const intro = path.join(routesDir, 'docs', 'intro', '+page.md');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const server = fakeServer();

		contentPlugin('serve').configureServer(server);
		expect(server.watcher.add).toHaveBeenCalledWith(path.join(routesDir, 'docs'));
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('/docs/theeming'));

		writePage('docs/intro', 'title: Intro', 'See [x](/docs/x).');
		server.handlers.change(intro);
		expect(warn).toHaveBeenCalledTimes(2);

		writePage('docs/x', 'title: X');
		server.handlers.add(path.join(routesDir, 'docs', 'x', '+page.md'));
		expect(info).toHaveBeenCalledWith(expect.stringContaining('no broken links left'));

		fs.rmSync(path.join(routesDir, 'docs', 'x'), { recursive: true });
		server.handlers.unlink(path.join(routesDir, 'docs', 'x', '+page.md'));
		expect(warn).toHaveBeenCalledTimes(3);
		warn.mockRestore();
		info.mockRestore();
	});

	it('reads the pages again in `vite build --watch`, which has no dev server', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		const plugin = pluginNamed('docsmith-content', {
			content: path.join(routesDir, 'docs'),
			routes: routesDir
		});
		const load = () =>
			(plugin.load as unknown as Load).call({ addWatchFile: vi.fn() }, '\0svelte-docsmith:search');
		expect(await load()).not.toContain('/docs/setup');

		writePage('docs/setup', 'title: Setup');
		(plugin.watchChange as unknown as (id: string) => void)(
			path.join(routesDir, 'docs', 'setup', '+page.md')
		);
		expect(await load()).toContain('/docs/setup');
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
// Matching is tested in `core/outside-path.test.ts`, the checks in
// `../links.test.ts` and `doc-pages.test.ts`, and `rel="external"` in
// `../markdown.test.ts`. These prove the plugin validates `links.outside` and
// wires it through to the compiler.

describe('docsmith() outside paths', () => {
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
