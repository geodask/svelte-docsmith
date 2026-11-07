import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { docsmith, type DocsmithOptions } from './index.js';
import { ARCHIVE_MARKER, markerContents } from '../archives.js';
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

const propsFixture = (name: string) =>
	path.resolve(import.meta.dirname, '../props/_fixtures', `${name}.svelte`);

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

/**
 * Mark a directory under the docs root as an archived version. The build
 * requires this of every declared archive, so a fixture that declares one has to
 * write it. See docs/adr/0003-the-archive-marker-defines-an-archive.md.
 */
function markArchive(id: string) {
	fs.writeFileSync(path.join(routesDir, 'docs', id, ARCHIVE_MARKER), markerContents(id));
}

/** Load one virtual module from a content plugin pointed at the fixture root. */
function loadVirtual(id: string, options: Omit<TestOptions, 'content' | 'routes'> = {}) {
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
		// The pages and the version manifest also go out together, for the shell.
		expect(out).toContain('export const content = { docs, versions };');
	});

	it('serves the changelog route with the releases, so the feed links where they were dated', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));

		const out = await loadVirtual('\0svelte-docsmith:changelog', {
			changelog: { path: '/releases' }
		});

		expect(out).toContain('export const changelogPath = "/releases";');
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

// --- agent markdown host ---------------------------------------------------
//
// What agent markdown says is tested against a literal host in
// `agent-markdown.test.ts`. These prove the host the plugin hands it: example
// files resolved through the plugin context, as Vite resolves the page's own
// imports (the fake `resolve` stands in for Vite's resolver, the app's aliases
// included), read from disk, watched, and warned about through the context.

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

describe('agent markdown through the plugin', () => {
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

	it('watches an example file it could not read, so creating it rebuilds the index', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		// Resolves, but reading a directory fails.
		const unreadable = path.join(routesDir, 'docs', 'examples', 'counter.svelte');
		fs.mkdirSync(unreadable, { recursive: true });
		writePage(
			'docs/examples',
			'title: Examples',
			"<script>\n\timport counterSource from './counter.svelte?source';\n</script>\n\n<LiveExample source={counterSource} />"
		);

		const { ctx } = await agentMarkdown();

		expect(ctx.addWatchFile).toHaveBeenCalledWith(unreadable);
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

// --- agent markdown host: props -------------------------------------------
//
// Props come from the shared extractor, which watches what they were read from
// and passes on its warnings. Pages import the props extractor's fixture
// components by absolute path. The first read builds a TypeScript program:
// seconds on a cold coverage run.

/** A page body whose `<script>` binds each `imports` name to a props import of its file. */
const propsPage = (imports: Record<string, string>, body: string) =>
	"<script>\n\timport { PropsTable } from 'svelte-docsmith';\n" +
	Object.entries(imports)
		.map(([local, file]) => `\timport ${local} from '${file}?props';\n`)
		.join('') +
	'</script>\n\n' +
	body;

describe('agent markdown props through the plugin', { timeout: 60_000 }, () => {
	it('writes out what was extracted when extraction has problems, and warns with the file', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage(
			'docs/untyped',
			'title: Untyped',
			propsPage({ untypedProps: propsFixture('untyped') }, '<PropsTable of={untypedProps} />')
		);

		const { content, ctx } = await agentMarkdown();

		expect(content['/docs/untyped']).toBe(
			[
				'# Untyped',
				'',
				'## `Untyped`',
				'',
				'| Prop | Type | Default | Description |',
				'| --- | --- | --- | --- |',
				'| `label?` |  |  |  |',
				'| `count?` *(bindable)* |  | `0` |  |',
				"| `aria-label?` |  | `'x'` |  |"
			].join('\n')
		);
		expect(ctx.warn).toHaveBeenCalledWith(
			expect.stringMatching(/untyped\.svelte: `\$props\(\)` has no type annotation/)
		);
	});

	it('reads props as markdown, watching each component and the files its types come from', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage(
			'docs/notice',
			'title: Notice',
			propsPage({ noticeProps: propsFixture('notice') }, '<PropsTable of={noticeProps} />')
		);

		const { content, ctx } = await agentMarkdown();

		// Descriptions arrive as markdown, links and code spans included.
		expect(content['/docs/notice']).toContain(
			"| `tone?` | `'neutral' \\| 'info' \\| 'danger'` | `'neutral'` | Visual intent. See [tones](/docs/tones) and `Tone`. |"
		);
		expect(ctx.addWatchFile).toHaveBeenCalledWith(propsFixture('notice'));
		expect(ctx.addWatchFile).toHaveBeenCalledWith(
			path.resolve(import.meta.dirname, '../props/_fixtures/types.ts')
		);
	});
});

// --- site config, options, markdown ---------------------------------------

/** The `svelte-docsmith/site` module's exports, each a JSON value. */
function siteModuleExports(code: string | undefined): Record<string, unknown> {
	const exports = String(code).matchAll(/^export const (\w+) = ([\s\S]*?);$/gm);
	return Object.fromEntries([...exports].map(([, name, json]) => [name, JSON.parse(json)]));
}

describe('docsmith() site config', () => {
	it('serves the site options as svelte-docsmith/site', async () => {
		const site = {
			title: 'My Docs',
			url: 'https://x.dev',
			nav: [{ label: 'Docs', href: '/docs' }]
		};
		const plugin = pluginNamed('docsmith-content', { site });
		const resolveId = plugin.resolveId as unknown as (id: string) => string | undefined;
		expect(resolveId.call({}, 'svelte-docsmith/site')).toBe('\0svelte-docsmith:site');

		const out = await (plugin.load as unknown as Load).call({}, '\0svelte-docsmith:site');
		expect(siteModuleExports(out).site).toEqual(site);
	});

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

describe('docsmith() markdown pages', () => {
	type Transform = { handler: (code: string, id: string) => Promise<{ code: string } | undefined> };
	const transform = (options: TestOptions = {}) =>
		pluginNamed('docsmith-markdown', options).transform as unknown as Transform;

	it('compiles a markdown page into Svelte markup, ahead of vite-plugin-svelte', async () => {
		const { handler, order } = transform() as Transform & { order: string };
		expect(order).toBe('pre');
		const out = await handler('## Hello\n\n```js\nconst a = 1;\n```', '/app/src/routes/x/+page.md');
		expect(out?.code).toContain('id="hello"');
		expect(out?.code).toContain('<Components.pre>');
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

	it('draws fences with the themes and line numbers set once for the site', async () => {
		const { handler } = transform({
			themes: { light: 'min-light', dark: 'min-dark' },
			markdown: { lineNumbers: true }
		});
		const out = await handler('```js\nconst a = 1;\n```', '/app/x/+page.md');
		// min-light's keyword colour; github-light's is #D73A49.
		expect(out?.code).toContain('#D32F2F');
		expect(out?.code).toContain('lineNumbers');
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

		expect(out).toContain('"path": "/docs/intro"');
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
		await expect(dev.load()).resolves.toContain('"path": "/docs/intro"');

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

	it('serves the outside paths beside the site config, for the shell links', async () => {
		const plugin = pluginNamed('docsmith-content', {
			links: { outside: ['/relative/', '/api'] }
		});

		const out = await (plugin.load as unknown as Load).call({}, '\0svelte-docsmith:site');

		// Resolved, so the browser matches them exactly as the compiler does.
		expect(siteModuleExports(out)).toEqual({ site: SITE, outside: ['/relative', '/api'] });
		const none = await (pluginNamed('docsmith-content').load as unknown as Load).call(
			{},
			'\0svelte-docsmith:site'
		);
		expect(siteModuleExports(none).outside).toEqual([]);
	});
});
