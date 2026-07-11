import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { collectDocs, collectSearchDocs, docsmith } from './vite.js';
import type { Plugin } from 'vite';

// Plugin hooks are typed as ObjectHook unions; in these plugins they are plain
// functions, so cast to call them directly with a fake Rollup plugin context.
type ResolveId = (this: unknown, id: string, importer?: string) => Promise<string | undefined>;
type Load = (this: unknown, id: string) => Promise<string | undefined> | string | undefined;

const SOURCE_PREFIX = '\0docsmith-source:';
const SOURCE_EXT = '.docsmith-src';

const pluginNamed = (name: string): Plugin => docsmith().find((p) => p.name === name) as Plugin;

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

let routesDir: string;

function writePage(relDir: string, frontmatter: string, body = '# body') {
	const dir = path.join(routesDir, relDir);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, '+page.md'), `---\n${frontmatter}\n---\n\n${body}\n`);
}

afterEach(() => {
	if (routesDir) fs.rmSync(routesDir, { recursive: true, force: true });
});

describe('collectDocs', () => {
	beforeAll(() => {});

	it('returns an empty array and warns when the content dir does not exist', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(collectDocs('/no/such/dir', '/no/such')).toEqual([]);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('content directory not found'));
		warn.mockRestore();
	});

	it('warns when the content dir exists but has no titled pages', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		fs.mkdirSync(path.join(routesDir, 'docs'), { recursive: true });
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		expect(collectDocs(path.join(routesDir, 'docs'), routesDir)).toEqual([]);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('no doc pages found'));
		warn.mockRestore();
	});

	it('throws with the filename on invalid YAML frontmatter', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const dir = path.join(routesDir, 'docs', 'broken');
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, '+page.md'), '---\ntitle: "unterminated\n---\n\n# body\n');

		expect(() => collectDocs(path.join(routesDir, 'docs'), routesDir)).toThrow(
			/invalid YAML frontmatter in .*broken.*\+page\.md/s
		);
	});

	it('reads frontmatter and derives the URL from the directory', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/introduction', 'title: Introduction\nsection: Guides\norder: 1');
		writePage('docs', 'title: Overview\norder: 0');

		const docs = collectDocs(path.join(routesDir, 'docs'), routesDir);

		expect(docs).toEqual([
			{
				title: 'Overview',
				path: '/docs',
				description: undefined,
				section: undefined,
				order: 0,
				sourcePath: expect.any(String),
				lastUpdated: undefined,
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
				toc: []
			}
		]);
	});

	it('extracts an h2/h3 TOC from the body, skipping code fences', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage(
			'docs/guide',
			'title: Guide',
			[
				'## Getting started',
				'',
				'```md',
				'## not a heading',
				'```',
				'',
				'### A `code` sub-step'
			].join('\n')
		);

		const [doc] = collectDocs(path.join(routesDir, 'docs'), routesDir);
		expect(doc.toc).toEqual([
			{ id: 'getting-started', title: 'Getting started', depth: 2 },
			{ id: 'a-code-sub-step', title: 'A code sub-step', depth: 3 }
		]);
	});

	it('slugs headings exactly like rehype-slug (github-slugger), incl. dupes', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage(
			'docs/slugs',
			'title: Slugs',
			['## Anchors & copy buttons', '', '## Usage', '', '## Usage'].join('\n')
		);

		const [doc] = collectDocs(path.join(routesDir, 'docs'), routesDir);
		expect((doc.toc ?? []).map((t) => t.id)).toEqual([
			// github-slugger drops `&` but keeps the surrounding spaces → double hyphen,
			// where the old hand-rolled slugify collapsed it to a single hyphen.
			'anchors--copy-buttons',
			'usage',
			'usage-1'
		]);
	});

	it('handles quoted values and colons inside frontmatter', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/x', 'title: "A: the beginning"\ndescription: "Uses http://x"');

		const [doc] = collectDocs(path.join(routesDir, 'docs'), routesDir);
		expect(doc.title).toBe('A: the beginning');
		expect(doc.description).toBe('Uses http://x');
	});

	it('skips pages without a title', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/titled', 'title: Kept');
		writePage('docs/untitled', 'description: no title here');

		expect(collectDocs(path.join(routesDir, 'docs'), routesDir).map((d) => d.title)).toEqual([
			'Kept'
		]);
	});

	it('ignores non-page files', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/real', 'title: Real');
		fs.writeFileSync(path.join(routesDir, 'docs', 'notes.md'), '# not a route');

		expect(collectDocs(path.join(routesDir, 'docs'), routesDir)).toHaveLength(1);
	});
});

describe('collectSearchDocs', () => {
	it('returns an empty array when the content dir does not exist', () => {
		expect(collectSearchDocs('/no/such/dir', '/no/such')).toEqual([]);
	});

	it('reduces a page to plain-text body, headings, and metadata', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage(
			'docs/guide',
			'title: Guide\ndescription: How to use it\nsection: Guides',
			[
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
			].join('\n')
		);

		const [doc] = collectSearchDocs(path.join(routesDir, 'docs'), routesDir);

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
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage(
			'docs/table',
			'title: Reference',
			['| Name | Type |', '| ---- | ---- |', '| variant | string |', '| title | string |'].join(
				'\n'
			)
		);

		const [doc] = collectSearchDocs(path.join(routesDir, 'docs'), routesDir);
		expect(doc.text).not.toContain('|');
		expect(doc.text).not.toContain('----');
		// Cell words survive as plain prose.
		expect(doc.text).toContain('Name Type');
		expect(doc.text).toContain('variant string');
	});

	it('skips pages without a title and sorts by path', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/b', 'title: Bravo', 'Second.');
		writePage('docs/a', 'title: Alpha', 'First.');
		writePage('docs/untitled', 'description: no title', 'Ignored.');

		expect(collectSearchDocs(path.join(routesDir, 'docs'), routesDir).map((d) => d.path)).toEqual([
			'/docs/a',
			'/docs/b'
		]);
	});
});

describe('docsmith() content plugin', () => {
	it('resolves the content and search specifiers to virtual modules', () => {
		const plugin = pluginNamed('docsmith-content');
		const resolveId = plugin.resolveId as unknown as (id: string) => string | undefined;
		expect(resolveId.call({}, 'svelte-docsmith/content')).toBe('\0svelte-docsmith:content');
		expect(resolveId.call({}, 'svelte-docsmith/search')).toBe('\0svelte-docsmith:search');
		expect(resolveId.call({}, 'something-else')).toBeUndefined();
	});

	it('loads the search virtual module as an exported docs array', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'Searchable body text.');

		const plugin = docsmith({ content: path.join(routesDir, 'docs'), routes: routesDir }).find(
			(p) => p.name === 'docsmith-content'
		)! as Plugin;
		const load = plugin.load as unknown as Load;
		const out = load.call({ addWatchFile: vi.fn() }, '\0svelte-docsmith:search') as string;

		expect(out).toContain('export const docs =');
		expect(out).toContain('Searchable body text.');
		expect(out).toContain('"path":"/docs/intro"');
	});

	it('loads the virtual module as an exported docs array', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\norder: 1');

		const plugin = docsmith({ content: path.join(routesDir, 'docs'), routes: routesDir }).find(
			(p) => p.name === 'docsmith-content'
		)! as Plugin;
		const load = plugin.load as unknown as Load;
		const out = load.call({ addWatchFile: vi.fn() }, '\0svelte-docsmith:content') as string;

		expect(out).toContain('export const docs =');
		expect(out).toContain('"title": "Intro"');
		expect(out).toContain('"path": "/docs/intro"');
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
