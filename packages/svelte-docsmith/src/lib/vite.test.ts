import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { collectDocs, docsmith } from './vite.js';
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
	});
});

// --- content index -------------------------------------------------------

let routesDir: string;

function writePage(relDir: string, frontmatter: string) {
	const dir = path.join(routesDir, relDir);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, '+page.md'), `---\n${frontmatter}\n---\n\n# body\n`);
}

afterEach(() => {
	if (routesDir) fs.rmSync(routesDir, { recursive: true, force: true });
});

describe('collectDocs', () => {
	beforeAll(() => {});

	it('returns an empty array when the content dir does not exist', () => {
		expect(collectDocs('/no/such/dir', '/no/such')).toEqual([]);
	});

	it('reads frontmatter and derives the URL from the directory', () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/introduction', 'title: Introduction\nsection: Guides\norder: 1');
		writePage('docs', 'title: Overview\norder: 0');

		const docs = collectDocs(path.join(routesDir, 'docs'), routesDir);

		expect(docs).toEqual([
			{ title: 'Overview', path: '/docs', description: undefined, section: undefined, order: 0 },
			{
				title: 'Introduction',
				path: '/docs/introduction',
				description: undefined,
				section: 'Guides',
				order: 1
			}
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

describe('docsmith() content plugin', () => {
	it('resolves the svelte-docsmith/content specifier to a virtual module', () => {
		const plugin = pluginNamed('docsmith-content');
		const resolveId = plugin.resolveId as unknown as (id: string) => string | undefined;
		expect(resolveId.call({}, 'svelte-docsmith/content')).toBe('\0svelte-docsmith:content');
		expect(resolveId.call({}, 'something-else')).toBeUndefined();
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
});
