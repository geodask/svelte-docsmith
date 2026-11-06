import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { docsmith, type DocsmithViteOptions } from './index.js';
import { ARCHIVE_MARKER, markerContents } from '../archives.js';
import type { Plugin } from 'vite';

// Plugin hooks are typed as ObjectHook unions; in these plugins they are plain
// functions, so cast to call them directly with a fake Rollup plugin context.
type ResolveId = (this: unknown, id: string, importer?: string) => Promise<string | undefined>;
type Load = (this: unknown, id: string) => Promise<string | undefined> | string | undefined;

const SOURCE_PREFIX = '\0docsmith-source:';
const SOURCE_EXT = '.docsmith-src';

const pluginNamed = (name: string, options: DocsmithViteOptions = {}): Plugin =>
	docsmith(options).find((p) => p.name === name) as Plugin;

// --- ?source transform ---------------------------------------------------

let fixture: string;

beforeAll(() => {
	fixture = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-')), 'Example.svelte');
	fs.writeFileSync(fixture, '<script>\n\tlet count = 0;\n</script>\n');
});

afterAll(() => {
	fs.rmSync(path.dirname(fixture), { recursive: true, force: true });
});

describe('docsmith() ?source transform', () => {
	it('maps a *.svelte?source id to the virtual source module', async () => {
		const ctx = { resolve: vi.fn().mockResolvedValue({ id: '/abs/Foo.svelte' }) };
		const resolveId = pluginNamed('docsmith-example-source').resolveId as unknown as ResolveId;

		const resolved = await resolveId.call(ctx, 'Foo.svelte?source', '/importer');

		expect(ctx.resolve).toHaveBeenCalledWith('Foo.svelte', '/importer', { skipSelf: true });
		expect(resolved).toBe(SOURCE_PREFIX + '/abs/Foo.svelte' + SOURCE_EXT);
	});

	it('returns the highlighted file source as the default export and watches the file', async () => {
		const ctx = { addWatchFile: vi.fn() };
		const load = pluginNamed('docsmith-example-source').load as unknown as Load;

		const out = await load.call(ctx, SOURCE_PREFIX + fixture + SOURCE_EXT);

		expect(ctx.addWatchFile).toHaveBeenCalledWith(fixture);
		expect(out).toMatch(/^export default /);
		expect(out).toContain('shiki');
		expect(out).toContain('count');
		// Shiki's own surface is stripped so the source sits on the component bg.
		expect(out).not.toContain('background-color');
		expect(out).not.toContain('--shiki-dark-bg');
	});
});

// --- ?props transform ----------------------------------------------------

const PROPS_PREFIX = '\0docsmith-props:';
const PROPS_EXT = '.docsmith-props';
const propsFixture = (name: string) =>
	path.resolve(import.meta.dirname, '../props/_fixtures', `${name}.svelte`);

// The first load builds a TypeScript program: seconds on a cold coverage run.
describe('docsmith() ?props transform', { timeout: 60_000 }, () => {
	it('maps a *.svelte?props id to the virtual props module', async () => {
		const ctx = { resolve: vi.fn().mockResolvedValue({ id: '/abs/Foo.svelte' }) };
		const resolveId = pluginNamed('docsmith-props').resolveId as unknown as ResolveId;

		expect(await resolveId.call(ctx, 'Foo.svelte?props', '/importer')).toBe(
			PROPS_PREFIX + '/abs/Foo.svelte' + PROPS_EXT
		);
		expect(ctx.resolve).toHaveBeenCalledWith('Foo.svelte', '/importer', { skipSelf: true });
		expect(await resolveId.call(ctx, 'Foo.svelte?source', '/importer')).toBeUndefined();
	});

	it('leaves an unresolvable component to Vite', async () => {
		const ctx = { resolve: vi.fn().mockResolvedValue(null) };
		const resolveId = pluginNamed('docsmith-props').resolveId as unknown as ResolveId;
		expect(await resolveId.call(ctx, 'Missing.svelte?props', '/importer')).toBeUndefined();
	});

	it('exports the extracted props and watches what they were read from', async () => {
		const plugin = pluginNamed('docsmith-props');
		const root = path.resolve(import.meta.dirname, '../../../..');
		(plugin.configResolved as unknown as (c: { root: string }) => void)({ root });
		const ctx = { addWatchFile: vi.fn(), warn: vi.fn() };
		const load = plugin.load as unknown as Load;

		const out = await load.call(ctx, PROPS_PREFIX + propsFixture('notice') + PROPS_EXT);

		expect(out).toMatch(/^export default /);
		const props = JSON.parse(
			String(out)
				.replace(/^export default /, '')
				.replace(/;$/, '')
		);
		expect(props.name).toBe('Notice');
		expect(props.props[0]).toMatchObject({ name: 'tone', type: "'neutral' | 'info' | 'danger'" });
		expect(ctx.addWatchFile).toHaveBeenCalledWith(propsFixture('notice'));
		expect(ctx.addWatchFile).toHaveBeenCalledWith(
			path.resolve(import.meta.dirname, '../props/_fixtures/types.ts')
		);
		expect(ctx.warn).not.toHaveBeenCalled();
	});

	it('passes extraction problems on as warnings', async () => {
		const ctx = { addWatchFile: vi.fn(), warn: vi.fn() };
		const load = pluginNamed('docsmith-props').load as unknown as Load;
		await load.call(ctx, PROPS_PREFIX + propsFixture('static') + PROPS_EXT);
		expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining('no `$props()` found'));
	});

	it('ignores ids that are not props modules', async () => {
		const load = pluginNamed('docsmith-props').load as unknown as Load;
		expect(await load.call({}, '/abs/Foo.svelte')).toBeUndefined();
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

/**
 * Mark a directory under the docs root as an archived version. The build
 * requires this of every declared archive, so a fixture that declares one has to
 * write it. See docs/adr/0003-the-archive-marker-defines-an-archive.md.
 */
function markArchive(id: string) {
	fs.writeFileSync(path.join(routesDir, 'docs', id, ARCHIVE_MARKER), markerContents(id));
}

/** Load one virtual module from a content plugin pointed at the fixture root. */
function loadVirtual(id: string, options: Omit<DocsmithViteOptions, 'content' | 'routes'> = {}) {
	const plugin = pluginNamed('docsmith-content', {
		content: path.join(routesDir, 'docs'),
		routes: routesDir,
		...options
	});
	const load = plugin.load as unknown as Load;
	return load.call({ addWatchFile: vi.fn() }, id) as Promise<string>;
}

afterEach(() => {
	if (routesDir) fs.rmSync(routesDir, { recursive: true, force: true });
});

describe('docsmith() content plugin', () => {
	it('resolves the content and search specifiers to virtual modules', () => {
		const plugin = pluginNamed('docsmith-content');
		const resolveId = plugin.resolveId as unknown as (id: string) => string | undefined;
		expect(resolveId.call({}, 'svelte-docsmith/content')).toBe('\0svelte-docsmith:content');
		expect(resolveId.call({}, 'svelte-docsmith/search')).toBe('\0svelte-docsmith:search');
		expect(resolveId.call({}, 'svelte-docsmith/llms')).toBe('\0svelte-docsmith:llms');
		expect(resolveId.call({}, 'something-else')).toBeUndefined();
	});

	it('loads the virtual module as an exported docs array', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\norder: 1');

		const out = await loadVirtual('\0svelte-docsmith:content');

		expect(out).toContain('export const docs =');
		expect(out).toContain('"title": "Intro"');
		expect(out).toContain('"path": "/docs/intro"');
	});

	it('loads the search virtual module as an exported docs array', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'Searchable body text.');

		const out = await loadVirtual('\0svelte-docsmith:search');

		expect(out).toContain('export const docs =');
		expect(out).toContain('Searchable body text.');
		expect(out).toContain('"path":"/docs/intro"');
	});

	it('loads the llms virtual module as an exported docs array', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'Full body markdown.');

		const out = await loadVirtual('\0svelte-docsmith:llms');

		expect(out).toContain('export const docs =');
		expect(out).toContain('Full body markdown.');
		expect(out).toContain('"path":"/docs/intro"');
	});

	it('writes each llms entry as the page markdown without its setup blocks', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage(
			'docs/guide/setup',
			'title: Setup\nsection: [Guide, Basics]\norder: 2\ndescription: Install it.',
			'<script>\n\timport X from "./x.svelte";\n</script>\n\n## Install\n\nRun `pnpm add x`.\n\n<X />\n\n<style>\n\tp { color: red; }\n</style>'
		);
		writePage('docs/intro', 'title: Intro', 'Hello.');

		expect(await loadVirtual('\0svelte-docsmith:llms')).toBe(
			'export const docs = [' +
				'{"path":"/docs/guide/setup","title":"Setup","section":"Guide / Basics","order":2,' +
				'"description":"Install it.","content":"# Setup\\n\\n## Install\\n\\nRun `pnpm add x`.\\n\\n<X />"},' +
				'{"path":"/docs/intro","title":"Intro","content":"# Intro\\n\\nHello."}' +
				'];\n'
		);
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
					await (plugin.load as unknown as Load).call(ctx, id);
				}
			}
		} finally {
			vi.doUnmock('typescript');
		}
		expect(loadedTypeScript).not.toHaveBeenCalled();
	});

	it('dates the content index from git, and leaves the other two indexes dateless', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', "title: Intro\nlastUpdated: '2026-03-04'");

		expect(await loadVirtual('\0svelte-docsmith:content')).toContain('"lastUpdated": "2026-03-04"');
		expect(await loadVirtual('\0svelte-docsmith:search')).not.toContain('lastUpdated');
		expect(await loadVirtual('\0svelte-docsmith:llms')).not.toContain('lastUpdated');
	});

	it('watches every page it read, so editing one re-runs the load', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		writePage('docs/untitled', 'description: not in the nav');

		const ctx = { addWatchFile: vi.fn() };
		const plugin = pluginNamed('docsmith-content', {
			content: path.join(routesDir, 'docs'),
			routes: routesDir
		});
		await (plugin.load as unknown as Load).call(ctx, '\0svelte-docsmith:content');

		// Including the untitled page: adding a title to it has to rebuild the nav.
		expect(ctx.addWatchFile).toHaveBeenCalledWith(
			path.join(routesDir, 'docs', 'intro', '+page.md')
		);
		expect(ctx.addWatchFile).toHaveBeenCalledWith(
			path.join(routesDir, 'docs', 'untitled', '+page.md')
		);
	});

	it('throws with the filename on invalid YAML frontmatter', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const dir = path.join(routesDir, 'docs', 'broken');
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, '+page.md'), '---\ntitle: "unterminated\n---\n\n# body\n');

		await expect(loadVirtual('\0svelte-docsmith:content')).rejects.toThrow(
			/invalid YAML frontmatter in .*broken.*\+page\.md/s
		);
	});

	it('fails the content index on frontmatter the schema rejects', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\nordr: 2');
		const schema: DocsmithViteOptions['schema'] = {
			'~standard': {
				version: 1,
				vendor: 'test',
				validate: (value) =>
					'ordr' in (value as object)
						? { issues: [{ message: 'Unrecognized key: "ordr"' }] }
						: { value }
			}
		};

		await expect(loadVirtual('\0svelte-docsmith:content', { schema })).rejects.toThrow(
			/invalid frontmatter in 1 page\n.*intro\/\+page\.md\n {4}Unrecognized key: "ordr"/
		);
	});

	it('builds without a schema, warning about a key that looks like a typo', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\nordr: 2');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const out = await loadVirtual('\0svelte-docsmith:content');

		expect(out).toContain('"ordr": 2');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('ordr: did you mean `order`?'));
		warn.mockRestore();
	});

	it('warns when the content dir does not exist', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const out = await loadVirtual('\0svelte-docsmith:content');

		expect(out).toContain('export const docs = [];');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('content directory not found'));
		warn.mockRestore();
	});

	it('leaves the search and llms modules empty and quiet on a missing content dir', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		// Only the content index reports it; two more copies of the same warning
		// would say nothing new.
		expect(await loadVirtual('\0svelte-docsmith:search')).toBe('export const docs = [];\n');
		expect(await loadVirtual('\0svelte-docsmith:llms')).toBe('export const docs = [];\n');
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it('warns when the content dir exists but has no titled pages', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		fs.mkdirSync(path.join(routesDir, 'docs'), { recursive: true });
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		await loadVirtual('\0svelte-docsmith:content');

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('no doc pages found'));
		warn.mockRestore();
	});

	it('emits a resolved versions manifest alongside docs when versions are declared', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\norder: 1');
		writePage('docs/v1/intro', 'title: Intro\norder: 1');
		markArchive('v1');

		const out = await loadVirtual('\0svelte-docsmith:content', {
			versions: { current: { id: 'v2', label: 'v2' }, archived: [{ id: 'v1', label: 'v1' }] }
		});

		expect(out).toContain('export const versions =');
		// The current version keeps the unprefixed docs root; only archives are prefixed.
		expect(out).toContain('"basePath": "/docs"');
		expect(out).toContain('"landing": "/docs/intro"');
		expect(out).toContain('"basePath": "/docs/v1"');
		expect(out).toContain('"version": "v2"'); // unprefixed page tagged as current
	});

	it('emits an empty versions manifest for an unversioned site', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');

		expect(await loadVirtual('\0svelte-docsmith:content')).toContain('export const versions = [];');
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

// --- agent markdown ------------------------------------------------------
//
// What an agent reads for a page: its llms index entry's `content`. Example
// files are resolved through the plugin context, as Vite resolves the page's
// own imports, so the fake `resolve` stands in for Vite's resolver (the app's
// aliases included).

const COUNTER =
	'<script>\n\tlet count = $state(0);\n</script>\n\n<button onclick={() => count++}>{count}</button>\n';

/** Write a file under the fixture routes root and return its absolute path. */
function writeFile(rel: string, contents: string) {
	const file = path.join(routesDir, rel);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, contents);
	return file;
}

/** A resolver like Vite's: relative to the importer, plus `#lib` and `$lib` aliases for `libDir`. */
function fakeResolve(libDir: string) {
	return vi.fn(async (specifier: string, importer?: string) => {
		const alias = /^[#$]lib\//.exec(specifier);
		const file = alias
			? path.join(libDir, specifier.slice(alias[0].length))
			: path.resolve(path.dirname(importer ?? ''), specifier);
		return fs.existsSync(file) ? { id: file } : null;
	});
}

/** Load the llms index with a full plugin context; each entry's content by path. */
async function agentMarkdown() {
	const plugin = pluginNamed('docsmith-content', {
		content: path.join(routesDir, 'docs'),
		routes: routesDir
	});
	const ctx = {
		addWatchFile: vi.fn(),
		warn: vi.fn(),
		resolve: fakeResolve(path.join(routesDir, 'lib'))
	};
	const out = String(await (plugin.load as unknown as Load).call(ctx, '\0svelte-docsmith:llms'));
	const docs = JSON.parse(out.replace(/^export const docs = /, '').replace(/;\n$/, '')) as {
		path: string;
		content: string;
	}[];
	return { content: Object.fromEntries(docs.map((d) => [d.path, d.content])), ctx };
}

describe('agent markdown', () => {
	it('writes a LiveExample as a fenced svelte block of the example file', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writeFile('docs/examples/counter.svelte', COUNTER);
		writePage(
			'docs/examples',
			'title: Examples',
			"<script>\n\timport { LiveExample } from 'svelte-docsmith';\n\timport Counter from './counter.svelte';\n\timport counterSource from './counter.svelte?source';\n</script>\n\nClick it:\n\n<LiveExample source={counterSource}>\n\t<Counter />\n</LiveExample>\n\nAfter."
		);

		const { content } = await agentMarkdown();

		expect(content['/docs/examples']).toBe(
			'# Examples\n\nClick it:\n\n```svelte\n<script>\n\tlet count = $state(0);\n</script>\n\n<button onclick={() => count++}>{count}</button>\n```\n\nAfter.'
		);
	});

	it("resolves source imports through the app's aliases, from the page", async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writeFile('lib/examples/hash.svelte', '<p>hash</p>\n');
		writeFile('lib/dollar.svelte', '<p>dollar</p>\n');
		const page = path.join(routesDir, 'docs', 'aliases', '+page.md');
		writePage(
			'docs/aliases',
			'title: Aliases',
			'<script>\n\timport hash from \'#lib/examples/hash.svelte?source\';\n\timport dollar from "$lib/dollar.svelte?source";\n</script>\n\n<LiveExample source={hash}><Hash /></LiveExample>\n\n<LiveExample source={dollar} />'
		);

		const { content, ctx } = await agentMarkdown();

		expect(content['/docs/aliases']).toBe(
			'# Aliases\n\n```svelte\n<p>hash</p>\n```\n\n```svelte\n<p>dollar</p>\n```'
		);
		expect(ctx.resolve).toHaveBeenCalledWith('#lib/examples/hash.svelte', page, { skipSelf: true });
		expect(ctx.resolve).toHaveBeenCalledWith('$lib/dollar.svelte', page, { skipSelf: true });
	});

	it('keeps a LiveExample whose source import does not resolve, and warns', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const body =
			"<script>\n\timport gone from '#lib/gone.svelte?source';\n</script>\n\n<LiveExample source={gone}>\n\t<Gone />\n</LiveExample>";
		writePage('docs/broken', 'title: Broken', body);

		const { content, ctx } = await agentMarkdown();

		expect(content['/docs/broken']).toBe(
			'# Broken\n\n<LiveExample source={gone}>\n\t<Gone />\n</LiveExample>'
		);
		expect(ctx.warn).toHaveBeenCalledTimes(1);
		expect(ctx.warn).toHaveBeenCalledWith(
			expect.stringMatching(/docs\/broken\/\+page\.md: .*`#lib\/gone\.svelte\?source`/)
		);
	});

	it('leaves LiveExamples in code samples and without a source import as written', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writeFile('docs/samples/counter.svelte', COUNTER);
		const body =
			"<script>\n\timport counterSource from './counter.svelte?source';\n\tconst html = '<b>x</b>';\n</script>\n\n" +
			'```svelte\n<LiveExample source={counterSource}>\n\t<Counter />\n</LiveExample>\n```\n\n' +
			'<LiveExample source={html}>\n\t<b>x</b>\n</LiveExample>';
		writePage('docs/samples', 'title: Samples', body);

		const { content, ctx } = await agentMarkdown();

		expect(content['/docs/samples']).toBe(
			'# Samples\n\n```svelte\n<LiveExample source={counterSource}>\n\t<Counter />\n</LiveExample>\n```\n\n' +
				'<LiveExample source={html}>\n\t<b>x</b>\n</LiveExample>'
		);
		expect(ctx.warn).not.toHaveBeenCalled();
	});

	it('fences example code that itself contains a fence', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writeFile('docs/nested/md.svelte', '<pre>```js\nx\n```</pre>\n');
		writePage(
			'docs/nested',
			'title: Nested',
			"<script>\n\timport md from './md.svelte?source';\n</script>\n\n- In a list:\n\n  <LiveExample source={md}>\n    <Md />\n  </LiveExample>"
		);

		const { content } = await agentMarkdown();

		expect(content['/docs/nested']).toBe(
			'# Nested\n\n- In a list:\n\n  ````svelte\n  <pre>```js\n  x\n  ```</pre>\n  ````'
		);
	});

	it('watches each example file it read, so editing one rebuilds the index', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const example = writeFile('docs/examples/counter.svelte', COUNTER);
		writePage(
			'docs/examples',
			'title: Examples',
			"<script>\n\timport counterSource from './counter.svelte?source';\n</script>\n\n<LiveExample source={counterSource} />"
		);

		const { ctx } = await agentMarkdown();

		expect(ctx.addWatchFile).toHaveBeenCalledWith(example);
	});

	it('leaves the search index as it was', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writeFile('docs/examples/counter.svelte', COUNTER);
		writePage(
			'docs/examples',
			'title: Examples',
			"<script>\n\timport counterSource from './counter.svelte?source';\n</script>\n\nTry it.\n\n<LiveExample source={counterSource} />"
		);

		const search = await loadVirtual('\0svelte-docsmith:search');

		expect(search).toContain('"text":"Try it."');
		expect(search).not.toContain('count');
	});
});
