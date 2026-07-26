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
	return load.call({ addWatchFile: vi.fn() }, id) as string;
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

	it('loads the virtual module as an exported docs array', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\norder: 1');

		const out = loadVirtual('\0svelte-docsmith:content');

		expect(out).toContain('export const docs =');
		expect(out).toContain('"title": "Intro"');
		expect(out).toContain('"path": "/docs/intro"');
	});

	it('loads the search virtual module as an exported docs array', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'Searchable body text.');

		const out = loadVirtual('\0svelte-docsmith:search');

		expect(out).toContain('export const docs =');
		expect(out).toContain('Searchable body text.');
		expect(out).toContain('"path":"/docs/intro"');
	});

	it('loads the llms virtual module as an exported docs array', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'Full body markdown.');

		const out = loadVirtual('\0svelte-docsmith:llms');

		expect(out).toContain('export const docs =');
		expect(out).toContain('Full body markdown.');
		expect(out).toContain('"path":"/docs/intro"');
	});

	it('dates the content index from git, and leaves the other two indexes dateless', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', "title: Intro\nlastUpdated: '2026-03-04'");

		expect(loadVirtual('\0svelte-docsmith:content')).toContain('"lastUpdated": "2026-03-04"');
		expect(loadVirtual('\0svelte-docsmith:search')).not.toContain('lastUpdated');
		expect(loadVirtual('\0svelte-docsmith:llms')).not.toContain('lastUpdated');
	});

	it('watches every page it read, so editing one re-runs the load', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		writePage('docs/untitled', 'description: not in the nav');

		const ctx = { addWatchFile: vi.fn() };
		const plugin = pluginNamed('docsmith-content', {
			content: path.join(routesDir, 'docs'),
			routes: routesDir
		});
		(plugin.load as unknown as Load).call(ctx, '\0svelte-docsmith:content');

		// Including the untitled page: adding a title to it has to rebuild the nav.
		expect(ctx.addWatchFile).toHaveBeenCalledWith(
			path.join(routesDir, 'docs', 'intro', '+page.md')
		);
		expect(ctx.addWatchFile).toHaveBeenCalledWith(
			path.join(routesDir, 'docs', 'untitled', '+page.md')
		);
	});

	it('throws with the filename on invalid YAML frontmatter', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const dir = path.join(routesDir, 'docs', 'broken');
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, '+page.md'), '---\ntitle: "unterminated\n---\n\n# body\n');

		expect(() => loadVirtual('\0svelte-docsmith:content')).toThrow(
			/invalid YAML frontmatter in .*broken.*\+page\.md/s
		);
	});

	it('warns when the content dir does not exist', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const out = loadVirtual('\0svelte-docsmith:content');

		expect(out).toContain('export const docs = [];');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('content directory not found'));
		warn.mockRestore();
	});

	it('leaves the search and llms modules empty and quiet on a missing content dir', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		// Only the content index reports it; two more copies of the same warning
		// would say nothing new.
		expect(loadVirtual('\0svelte-docsmith:search')).toBe('export const docs = [];\n');
		expect(loadVirtual('\0svelte-docsmith:llms')).toBe('export const docs = [];\n');
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it('warns when the content dir exists but has no titled pages', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		fs.mkdirSync(path.join(routesDir, 'docs'), { recursive: true });
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		loadVirtual('\0svelte-docsmith:content');

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('no doc pages found'));
		warn.mockRestore();
	});

	it('emits a resolved versions manifest alongside docs when versions are declared', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\norder: 1');
		writePage('docs/v1/intro', 'title: Intro\norder: 1');
		markArchive('v1');

		const out = loadVirtual('\0svelte-docsmith:content', {
			versions: { current: { id: 'v2', label: 'v2' }, archived: [{ id: 'v1', label: 'v1' }] }
		});

		expect(out).toContain('export const versions =');
		// The current version keeps the unprefixed docs root; only archives are prefixed.
		expect(out).toContain('"basePath": "/docs"');
		expect(out).toContain('"landing": "/docs/intro"');
		expect(out).toContain('"basePath": "/docs/v1"');
		expect(out).toContain('"version": "v2"'); // unprefixed page tagged as current
	});

	it('emits an empty versions manifest for an unversioned site', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');

		expect(loadVirtual('\0svelte-docsmith:content')).toContain('export const versions = [];');
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
