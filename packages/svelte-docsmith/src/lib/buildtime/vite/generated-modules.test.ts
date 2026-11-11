import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARCHIVE_MARKER, markerContents } from '../archives.js';
import { docImportDeps } from './doc-imports/index.js';
import {
	DefaultExportOf,
	GENERATED_MODULE_NAMES,
	generatedModules,
	writeModule,
	type GeneratedModuleName
} from './generated-modules.js';
import { resolveOptions, type DocsmithOptions } from './options.js';

// These read each generated module as data, against a real docs root on disk.
// That is the point: the index builders are unit-tested against in-memory
// pages in `collect.test.ts`, so this file is what proves a `docsmith()` call
// reads the filesystem it is pointed at. How the Vite plugin serves the set is
// in `vite.test.ts`.

/** `docsmith()`'s options, with a site filled in when the test doesn't care which. */
type TestOptions = Omit<DocsmithOptions, 'site'> & Partial<Pick<DocsmithOptions, 'site'>>;

const SITE = { title: 'Docs' };

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

/**
 * Mark a directory under the docs root as an archived version. The build
 * requires this of every declared archive, so a fixture that declares one has to
 * write it. See docs/adr/0003-the-archive-marker-defines-an-archive.md.
 */
function markArchive(id: string) {
	fs.writeFileSync(path.join(routesDir, 'docs', id, ARCHIVE_MARKER), markerContents(id));
}

/** A resolver like Vite's: relative to the importer, plus `#lib` and `$lib` aliases for `libDir`. */
function fakeResolve(libDir: string) {
	return vi.fn(async (specifier: string, importer?: string) => {
		const alias = /^[#$]lib\//.exec(specifier);
		const file = alias
			? path.join(libDir, specifier.slice(alias[0].length))
			: path.resolve(path.dirname(importer ?? ''), specifier);
		return fs.existsSync(file) ? file : undefined;
	});
}

/** The generated modules of a `docsmith()` call pointed at the fixture root, and a host to read them with. */
function generated(options: TestOptions = {}) {
	const resolved = resolveOptions({
		site: SITE,
		...(routesDir ? { content: path.join(routesDir, 'docs'), routes: routesDir } : {}),
		...options
	});
	const pagesRead = vi.fn();
	const set = generatedModules(resolved, docImportDeps(resolved), { pagesRead });
	const host = {
		watch: vi.fn(),
		warn: vi.fn(),
		resolve: fakeResolve(path.join(routesDir ?? '', 'lib'))
	};
	return {
		set,
		host,
		pagesRead,
		read: <K extends GeneratedModuleName>(name: K) => set.read(name, host)
	};
}

afterEach(() => {
	if (routesDir) fs.rmSync(routesDir, { recursive: true, force: true });
	routesDir = undefined as unknown as string;
});

describe('the set of generated modules', () => {
	const pkg = JSON.parse(
		fs.readFileSync(path.resolve(import.meta.dirname, '../../../../package.json'), 'utf8')
	) as { exports: Record<string, { default: string }> };

	// The two places a module's name is written that TypeScript can't check.
	it.each(GENERATED_MODULE_NAMES)('%s has a fallback and a package export', (name) => {
		expect(fs.existsSync(path.resolve(import.meta.dirname, `../../fallbacks/${name}.ts`))).toBe(
			true
		);
		expect(pkg.exports[`./${name}`].default).toBe(`./dist/fallbacks/${name}.js`);
	});

	it('resolves each specifier to its own id, and nothing else', () => {
		const { set } = generated();
		const ids = GENERATED_MODULE_NAMES.map((name) => set.resolve(`svelte-docsmith/${name}`));
		expect(new Set(ids).size).toBe(GENERATED_MODULE_NAMES.length);
		expect(ids.every((id) => id?.startsWith('\0'))).toBe(true);
		expect(set.resolve('svelte-docsmith')).toBeUndefined();
		expect(set.resolve('something-else')).toBeUndefined();
	});

	it('names the modules built from the doc pages, for the dev server to load again', () => {
		const { set } = generated();
		expect(set.builtFromPages).toEqual(
			['content', 'search', 'llms'].map((name) => set.resolve(`svelte-docsmith/${name}`))
		);
	});

	it('loads a module as the JavaScript of what it reads, and no other id', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		const { set, host, read } = generated();

		const id = set.resolve('svelte-docsmith/search')!;
		expect(await set.load(id, host)).toBe(writeModule(await read('search')));
		expect(await set.load('\0something-else', host)).toBeUndefined();
	});
});

describe('writeModule', () => {
	it('writes each export as JSON, and undefined as itself', () => {
		expect(writeModule({ docs: [{ path: '/docs' }], githubStars: undefined, n: 3 })).toBe(
			'export const docs = [{"path":"/docs"}];\n' +
				'export const githubStars = undefined;\n' +
				'export const n = 3;\n'
		);
	});

	it('writes an export that gathers earlier ones as references, so the data goes out once', () => {
		const docs = [{ path: '/docs' }];
		const versions: unknown[] = [];
		expect(writeModule({ docs, versions, content: { docs, versions } })).toBe(
			'export const docs = [{"path":"/docs"}];\n' +
				'export const versions = [];\n' +
				'export const content = { docs, versions };\n'
		);
		// Equal is not the same: only the very values already written are referred to.
		expect(writeModule({ docs, content: { docs: [{ path: '/docs' }] } })).toContain(
			'export const content = {"docs":[{"path":"/docs"}]};'
		);
	});

	it("re-exports another module's default export", () => {
		expect(writeModule({ handler: new DefaultExportOf('C:\\app\\src\\events.ts') })).toBe(
			'export { default as handler } from "C:/app/src/events.ts";\n'
		);
	});
});

describe('svelte-docsmith/content', () => {
	it('holds every titled page, alone and with the version manifest', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\norder: 1');

		const { docs, versions, content } = await generated().read('content');

		expect(docs).toEqual([expect.objectContaining({ title: 'Intro', path: '/docs/intro' })]);
		// The pages and the version manifest also go out together, for the shell.
		expect(content.docs).toBe(docs);
		expect(content.versions).toBe(versions);
	});

	it('is dated from git or frontmatter, which the other two indexes are not', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', "title: Intro\nlastUpdated: '2026-03-04'");
		const { read } = generated();

		expect((await read('content')).docs[0].lastUpdated).toBe('2026-03-04');
		expect((await read('search')).docs[0]).not.toHaveProperty('lastUpdated');
		expect((await read('llms')).docs[0]).not.toHaveProperty('lastUpdated');
	});

	it('watches every page it read, so editing one loads it again', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		writePage('docs/untitled', 'description: not in the nav');
		const { read, host } = generated();

		await read('content');

		// Including the untitled page: adding a title to it has to rebuild the nav.
		expect(host.watch).toHaveBeenCalledWith(path.join(routesDir, 'docs', 'intro', '+page.md'));
		expect(host.watch).toHaveBeenCalledWith(path.join(routesDir, 'docs', 'untitled', '+page.md'));
	});

	it('hands the pages it read to the hook, once', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');
		const { read, pagesRead } = generated();

		await read('content');
		await read('search');
		await read('llms');

		expect(pagesRead).toHaveBeenCalledTimes(1);
		expect(pagesRead.mock.calls[0][0]).toEqual([
			expect.objectContaining({ file: path.join(routesDir, 'docs', 'intro', '+page.md') })
		]);
	});

	it('throws with the filename on invalid YAML frontmatter', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writeFile('docs/broken/+page.md', '---\ntitle: "unterminated\n---\n\n# body\n');

		await expect(generated().read('content')).rejects.toThrow(
			/invalid YAML frontmatter in .*broken.*\+page\.md/s
		);
	});

	it('fails on frontmatter the schema rejects', async () => {
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

		await expect(generated({ schema }).read('content')).rejects.toThrow(
			/invalid frontmatter in 1 page\n.*intro\/\+page\.md\n {4}Unrecognized key: "ordr"/
		);
	});

	it('builds without a schema, warning about a key that looks like a typo', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\nordr: 2');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const { docs } = await generated().read('content');

		expect(docs[0].data).toEqual({ ordr: 2 });
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('ordr: did you mean `order`?'));
		warn.mockRestore();
	});

	it('warns when the content dir does not exist', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		expect((await generated().read('content')).docs).toEqual([]);

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('content directory not found'));
		warn.mockRestore();
	});

	it('leaves the search and llms indexes empty and quiet on a missing content dir', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { read } = generated();

		// Only the content index reports it; two more copies of the same warning
		// would say nothing new.
		expect(await read('search')).toEqual({ docs: [] });
		expect(await read('llms')).toEqual({ docs: [] });
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it('warns when the content dir exists but has no titled pages', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		fs.mkdirSync(path.join(routesDir, 'docs'), { recursive: true });
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		await generated().read('content');

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('no doc pages found'));
		warn.mockRestore();
	});

	it('resolves the version manifest when versions are declared', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro\norder: 1');
		writePage('docs/v1/intro', 'title: Intro\norder: 1');
		markArchive('v1');

		const { docs, versions } = await generated({
			versions: { current: { id: 'v2', label: 'v2' }, archived: [{ id: 'v1', label: 'v1' }] }
		}).read('content');

		// The current version keeps the unprefixed docs root; only archives are prefixed.
		expect(versions).toEqual([
			expect.objectContaining({ id: 'v2', basePath: '/docs', landing: '/docs/intro' }),
			expect.objectContaining({ id: 'v1', basePath: '/docs/v1' })
		]);
		// The unprefixed page is tagged as current.
		expect(docs.find((doc) => doc.path === '/docs/intro')?.version).toBe('v2');
	});

	it('has an empty version manifest for an unversioned site', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro');

		expect((await generated().read('content')).versions).toEqual([]);
	});
});

describe('svelte-docsmith/search', () => {
	it("holds each page's plain text", async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'Searchable body text.');

		expect((await generated().read('search')).docs).toEqual([
			expect.objectContaining({ path: '/docs/intro', text: 'Searchable body text.' })
		]);
	});

	it("leaves a live example's source out", async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writeFile('docs/examples/counter.svelte', COUNTER);
		writePage(
			'docs/examples',
			'title: Examples',
			"<script>\n\timport counterSource from './counter.svelte?source';\n</script>\n\nTry it.\n\n<LiveExample source={counterSource} />"
		);

		expect((await generated().read('search')).docs[0].text).toBe('Try it.');
	});
});

describe('svelte-docsmith/changelog', () => {
	it('holds the changelog route with the releases, so the feed links where they were dated', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));

		const { changelogPath } = await generated({ changelog: { path: '/releases' } }).read(
			'changelog'
		);

		expect(changelogPath).toBe('/releases');
	});

	it('holds no releases with the changelog off', async () => {
		expect((await generated({ changelog: false }).read('changelog')).releases).toEqual([]);
	});

	it('reads and watches the changelog file', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const file = writeFile(
			'CHANGELOG.md',
			'# pkg\n\n## 1.2.0\n\n### Minor Changes\n\n- A thing.\n'
		);
		const { read, host } = generated({ changelog: { file } });

		const { releases } = await read('changelog');

		expect(releases.map((release) => release.version)).toEqual(['1.2.0']);
		expect(host.watch).toHaveBeenCalledWith(file);
	});
});

// --- svelte-docsmith/llms: the agent markdown host -------------------------
//
// What agent markdown says is tested against a literal host in
// `agent-markdown.test.ts`. These prove the host this module hands it: example
// files resolved through the module's host, as Vite resolves the page's own
// imports (the fake `resolve` stands in for Vite's resolver, the app's aliases
// included), read from disk, watched, and warned about through the host.

const COUNTER =
	'<script>\n\tlet count = $state(0);\n</script>\n\n<button onclick={() => count++}>{count}</button>\n';

/** Read the llms index; each entry's content by path. */
async function agentMarkdown() {
	const { read, host } = generated();
	const { docs } = await read('llms');
	return { content: Object.fromEntries(docs.map((d) => [d.path, d.content])), host };
}

describe('svelte-docsmith/llms', () => {
	it("holds each page's agent markdown", async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage('docs/intro', 'title: Intro', 'Full body markdown.');

		const { content } = await agentMarkdown();

		expect(content['/docs/intro']).toBe('# Intro\n\nFull body markdown.');
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

		const { content, host } = await agentMarkdown();

		expect(content['/docs/aliases']).toBe(
			'# Aliases\n\n```svelte\n<p>hash</p>\n```\n\n```svelte\n<p>dollar</p>\n```'
		);
		expect(host.resolve).toHaveBeenCalledWith('#lib/examples/hash.svelte', page);
		expect(host.resolve).toHaveBeenCalledWith('$lib/dollar.svelte', page);
	});

	it('keeps a LiveExample whose source import does not resolve, and warns', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		const body =
			"<script>\n\timport gone from '#lib/gone.svelte?source';\n</script>\n\n<LiveExample source={gone}>\n\t<Gone />\n</LiveExample>";
		writePage('docs/broken', 'title: Broken', body);

		const { content, host } = await agentMarkdown();

		expect(content['/docs/broken']).toBe(
			'# Broken\n\n<LiveExample source={gone}>\n\t<Gone />\n</LiveExample>'
		);
		expect(host.warn).toHaveBeenCalledTimes(1);
		expect(host.warn).toHaveBeenCalledWith(
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

		const { host } = await agentMarkdown();

		expect(host.watch).toHaveBeenCalledWith(example);
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

		const { host } = await agentMarkdown();

		expect(host.watch).toHaveBeenCalledWith(unreadable);
	});
});

// Props come from the shared extractor, which watches what they were read from
// and passes on its warnings. Pages import the props extractor's fixture
// components by absolute path. The first read builds a TypeScript program:
// seconds on a cold coverage run.

const propsFixture = (name: string) =>
	path.resolve(import.meta.dirname, '../props/_fixtures', `${name}.svelte`);

/** A page body whose `<script>` binds each `imports` name to a props import of its file. */
const propsPage = (imports: Record<string, string>, body: string) =>
	'<script>\n' +
	Object.entries(imports)
		.map(([local, file]) => `\timport ${local} from '${file}?props';\n`)
		.join('') +
	'</script>\n\n' +
	body;

describe('svelte-docsmith/llms props', { timeout: 60_000 }, () => {
	it('writes out what was extracted when extraction has problems, and warns with the file', async () => {
		routesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
		writePage(
			'docs/untyped',
			'title: Untyped',
			propsPage({ untypedProps: propsFixture('untyped') }, '<PropsTable of={untypedProps} />')
		);

		const { content, host } = await agentMarkdown();

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
		expect(host.warn).toHaveBeenCalledWith(
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

		const { content, host } = await agentMarkdown();

		// Descriptions arrive as markdown, links and code spans included.
		expect(content['/docs/notice']).toContain(
			"| `tone?` | `'neutral' \\| 'info' \\| 'danger'` | `'neutral'` | Visual intent. See [tones](/docs/tones) and `Tone`. |"
		);
		expect(host.watch).toHaveBeenCalledWith(propsFixture('notice'));
		expect(host.watch).toHaveBeenCalledWith(
			path.resolve(import.meta.dirname, '../props/_fixtures/types.ts')
		);
	});
});

describe('svelte-docsmith/site', () => {
	it('holds the site options as written', async () => {
		const site = {
			title: 'My Docs',
			url: 'https://x.dev',
			nav: [{ label: 'Docs', href: '/docs' }]
		};

		expect((await generated({ site }).read('site')).site).toEqual(site);
	});

	it("holds the theme's OG image colours", async () => {
		const { ogColours } = await generated({ theme: 'ocean' }).read('site');

		expect(ogColours).toEqual({
			background: expect.stringMatching(/^#[0-9a-f]{6}$/),
			foreground: expect.stringMatching(/^#[0-9a-f]{6}$/),
			muted: expect.stringMatching(/^#[0-9a-f]{6}$/),
			primary: expect.stringMatching(/^#[0-9a-f]{6}$/),
			border: expect.stringMatching(/^(#[0-9a-f]{6}|rgba\(.*\))$/)
		});
		expect(ogColours).not.toEqual((await generated().read('site')).ogColours);
	});

	it('holds the outside paths, for the shell links', async () => {
		// Resolved, so the browser matches them exactly as the compiler does.
		expect(
			await generated({ links: { outside: ['/relative/', '/api'] } }).read('site')
		).toMatchObject({ site: SITE, outside: ['/relative', '/api'] });
		expect((await generated().read('site')).outside).toEqual([]);
	});

	describe('GitHub star count', () => {
		const site = { title: 'Docs', github: 'https://github.com/o/r' };
		const stars = (count: number) =>
			new Response(JSON.stringify({ stargazers_count: count }), { status: 200 });
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it('is held beside the site, fetched once per docsmith() call', async () => {
			const fetch = vi.fn().mockResolvedValue(stars(4321));
			vi.stubGlobal('fetch', fetch);
			const { read } = generated({ site });

			expect(await read('site')).toMatchObject({ site, githubStars: 4321 });
			await read('site');
			expect(fetch).toHaveBeenCalledTimes(1);
		});

		// A `dev` restart loads `vite.config` again, which calls `docsmith()` again.
		it('is fetched afresh by a new call, so a restart recovers from a failed fetch', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const fetch = vi
				.fn()
				.mockRejectedValueOnce(new TypeError('fetch failed'))
				.mockResolvedValueOnce(stars(5));
			vi.stubGlobal('fetch', fetch);

			expect((await generated({ site }).read('site')).githubStars).toBeUndefined();
			expect(warn.mock.calls[0][0]).toMatch(
				/could not fetch the GitHub star count for https:\/\/github\.com\/o\/r at build time\n {2}Could not reach/
			);
			expect((await generated({ site }).read('site')).githubStars).toBe(5);
		});

		it('is absent, and nothing is fetched, with githubStars: false', async () => {
			const fetch = vi.fn();
			vi.stubGlobal('fetch', fetch);

			const { githubStars } = await generated({
				site: { ...site, githubStars: false }
			}).read('site');

			expect(githubStars).toBeUndefined();
			expect(fetch).not.toHaveBeenCalled();
		});
	});
});

describe('svelte-docsmith/reader-events', () => {
	it('holds no handler when readerEvents names none', async () => {
		expect(await generated().read('reader-events')).toEqual({ handler: undefined });
	});

	it("holds the named module's default export as the handler", async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-reader-events-'));
		try {
			const file = path.join(dir, 'reader-events.ts');
			fs.writeFileSync(file, 'export default () => {};\n');
			const cwd = vi.spyOn(process, 'cwd').mockReturnValue(dir);
			const { read } = generated({ readerEvents: './reader-events.ts' });
			cwd.mockRestore();

			expect(await read('reader-events')).toEqual({ handler: new DefaultExportOf(file) });
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});
