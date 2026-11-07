import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { run, CliError } from './run.js';
import { ARCHIVE_MARKER, discoverArchives } from '../archives.js';

let dir: string | undefined;

afterEach(() => {
	if (dir) fs.rmSync(dir, { recursive: true, force: true });
	dir = undefined;
});

const write = (file: string, text: string) => {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, text);
};

/**
 * A `vite.config.mjs` whose plugin list carries `docsmith()` options the way
 * the real content plugin does: on `api.docsmith`, nested in an array and
 * behind a promise, as Vite allows. Loaded by Vite's own loader, like a site's.
 */
function viteConfig(options: object, file = 'vite.config.mjs') {
	const plugin = {
		name: 'docsmith-content',
		api: { docsmith: { site: { title: 'T' }, ...options } }
	};
	write(
		path.join(dir!, file),
		`export default { plugins: [{ name: 'other' }, [Promise.resolve(${JSON.stringify(plugin)})]] };\n`
	);
}

/**
 * A minimal SvelteKit docs tree in a real git repo, since the command reads
 * commit dates. Two pages, one linking to the other, plus the root layout and
 * error page an archive is supposed to inherit rather than copy, and a vite
 * config with default docsmith() options.
 */
function scratch(options: object = {}): string {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-cli-'));
	const docs = path.join(dir, 'src/routes/docs');
	viteConfig(options);

	write(path.join(docs, '+layout.svelte'), '<slot />\n');
	write(path.join(docs, '+error.svelte'), '<h1>Not found</h1>\n');
	write(
		path.join(docs, '+page.md'),
		'---\ntitle: Intro\n---\n\nStart with [theming](/docs/theming).\n'
	);
	write(path.join(docs, 'theming/+page.md'), '---\ntitle: Theming\n---\n\nColours.\n');
	write(path.join(docs, 'guides/nested/+page.md'), '---\ntitle: Nested\n---\n\nDeep.\n');

	const git = (...args: string[]) => spawnSync('git', args, { cwd: dir, encoding: 'utf-8' });
	git('init', '-q');
	git('config', 'user.email', 'test@example.com');
	git('config', 'user.name', 'Test');
	git('add', '.');
	git('commit', '-q', '-m', 'docs');

	return dir;
}

/** Run the command against `cwd`, collecting what it printed. */
async function archive(cwd: string, args: string[] = ['archive-version', 'v1']): Promise<string> {
	const lines: string[] = [];
	await run(args, { cwd, log: (line) => lines.push(line) });
	return lines.join('\n');
}

const read = (cwd: string, rel: string) => fs.readFileSync(path.join(cwd, rel), 'utf-8');
const exists = (cwd: string, rel: string) => fs.existsSync(path.join(cwd, rel));

describe('archive-version', () => {
	it('copies the docs root into the archive and marks it', async () => {
		const cwd = scratch();
		await archive(cwd);

		expect(exists(cwd, `src/routes/docs/v1/${ARCHIVE_MARKER}`)).toBe(true);
		expect(exists(cwd, 'src/routes/docs/v1/+page.md')).toBe(true);
		expect(exists(cwd, 'src/routes/docs/v1/theming/+page.md')).toBe(true);
		expect(exists(cwd, 'src/routes/docs/v1/guides/nested/+page.md')).toBe(true);
		// The docs root is untouched: archiving copies, it does not move.
		expect(exists(cwd, 'src/routes/docs/+page.md')).toBe(true);
	});

	// The archive is nested inside them already; copying would nest a second shell.
	it('leaves the inherited layout and error page behind', async () => {
		const cwd = scratch();
		await archive(cwd);
		expect(exists(cwd, 'src/routes/docs/v1/+layout.svelte')).toBe(false);
		expect(exists(cwd, 'src/routes/docs/v1/+error.svelte')).toBe(false);
	});

	// An absolute link resolves to the current docs forever, so a verbatim copy
	// would walk readers out of the archive with no banner.
	it('rewrites in-content docs links to stay inside the archive', async () => {
		const cwd = scratch();
		await archive(cwd);
		expect(read(cwd, 'src/routes/docs/v1/+page.md')).toContain('](/docs/v1/theming)');
		expect(read(cwd, 'src/routes/docs/+page.md')).toContain('](/docs/theming)');
	});

	// Every page is copied in one commit, so without freezing, the whole archive
	// would claim it was updated the day it was created.
	it('freezes each page’s real commit day into its frontmatter', async () => {
		const cwd = scratch();
		await archive(cwd);
		expect(read(cwd, 'src/routes/docs/v1/+page.md')).toMatch(/^lastUpdated: '\d{4}-\d{2}-\d{2}'$/m);
	});

	it('reports the page count and the config to paste', async () => {
		const cwd = scratch();
		const output = await archive(cwd);
		expect(output).toContain('(3 pages)');
		expect(output).toContain("archived: [{ id: 'v1', label: 'v1' }]");
	});

	it('uses --label for the switcher entry it prints', async () => {
		const cwd = scratch();
		const output = await archive(cwd, ['archive-version', 'v1', '--label', 'v1.x']);
		expect(output).toContain("{ id: 'v1', label: 'v1.x' }");
	});

	it('prints a label with quotes as a valid string literal', async () => {
		const cwd = scratch();
		const label = "Bob's \\ 1.x";
		const output = await archive(cwd, ['archive-version', 'v1', '--label', label]);
		const literal = output.match(/archived: \[(\{.*\})\]/)?.[1];
		expect(new Function(`return ${literal}`)()).toEqual({ id: 'v1', label });
	});

	it('reads the content and routes directories from the docsmith() options', async () => {
		const cwd = scratch({ content: 'app/docs', routes: 'app' });
		fs.renameSync(path.join(cwd, 'src/routes'), path.join(cwd, 'app'));
		await archive(cwd);
		expect(exists(cwd, `app/docs/v1/${ARCHIVE_MARKER}`)).toBe(true);
		expect(read(cwd, 'app/docs/v1/+page.md')).toContain('](/docs/v1/theming)');
	});

	it('reads the config named by --config', async () => {
		const cwd = scratch();
		fs.renameSync(path.join(cwd, 'src/routes'), path.join(cwd, 'app'));
		fs.rmSync(path.join(cwd, 'vite.config.mjs'));
		viteConfig({ content: 'app/docs', routes: 'app' }, 'config/docs.vite.mjs');
		await archive(cwd, ['archive-version', 'v1', '--config', 'config/docs.vite.mjs']);
		expect(exists(cwd, `app/docs/v1/${ARCHIVE_MARKER}`)).toBe(true);
	});

	// Reading the versions is what lets it print a block to paste as it is.
	it('prints the next versions block from the declared versions', async () => {
		const cwd = scratch({
			versions: { current: { id: 'v2', label: 'v2.x' }, archived: [] }
		});
		const output = await archive(cwd, ['archive-version', 'v2']);
		expect(output).toContain("current: { id: '<new release>', label: '<new release>' }");
		// Retiring the current version keeps its label.
		expect(output).toContain("archived: [{ id: 'v2', label: 'v2.x' }]");
	});

	it('keeps the archives already declared, after the new one', async () => {
		const cwd = scratch({ versions: { current: { id: 'v2', label: 'v2' } } });
		await archive(cwd, ['archive-version', 'v1']);
		viteConfig({
			versions: {
				current: { id: 'v3', label: 'v3' },
				archived: [{ id: 'v1', label: 'v1', noindex: true }]
			}
		});
		const output = await archive(cwd, ['archive-version', 'v2', '--label', 'Two']);
		expect(output).toContain(
			"archived: [{ id: 'v2', label: 'Two' }, { id: 'v1', label: 'v1', noindex: true }]"
		);
	});

	it('accepts an archive declared before it was created, and lists it once', async () => {
		const cwd = scratch({
			versions: { current: { id: 'v2', label: 'v2' }, archived: [{ id: 'v1', label: 'One' }] }
		});
		const output = await archive(cwd, ['archive-version', 'v1', '--label', 'One']);
		expect(output).toContain("archived: [{ id: 'v1', label: 'One' }]");
	});

	it('does not copy an earlier archive into a new one', async () => {
		const cwd = scratch();
		await archive(cwd, ['archive-version', 'v1']);
		await archive(cwd, ['archive-version', 'v2']);

		expect(exists(cwd, 'src/routes/docs/v2/v1')).toBe(false);
		expect(discoverArchives(path.join(cwd, 'src/routes/docs')).marked.sort()).toEqual(['v1', 'v2']);
	});

	// A page in the docs root may already link into an existing archive.
	it('leaves links that already point at an archive alone', async () => {
		const cwd = scratch();
		await archive(cwd, ['archive-version', 'v1']);
		write(
			path.join(cwd, 'src/routes/docs/+page.md'),
			'---\ntitle: Intro\n---\n\nOld [docs](/docs/v1/theming).\n'
		);
		await archive(cwd, ['archive-version', 'v2']);
		expect(read(cwd, 'src/routes/docs/v2/+page.md')).toContain('](/docs/v1/theming)');
	});

	it('mentions that the build fails until the config is pasted', async () => {
		const cwd = scratch();
		expect(await archive(cwd)).toMatch(/build will fail/);
	});
});

/**
 * Archiving copies the docs root and nothing else, so a page importing from
 * outside it keeps resolving to current code once frozen. The author should
 * hear about it while the terminal is still open.
 * See `docs/adr/0005-an-archive-freezes-content-not-dependencies.md`.
 */
describe('archive-version freeze boundary notice', () => {
	/** A page under the docs root whose script block holds `code`. */
	const page = (cwd: string, route: string, code: string) =>
		write(
			path.join(cwd, 'src/routes/docs', route, '+page.md'),
			`---\ntitle: ${route}\n---\n\n<script>\n\t${code}\n</script>\n\nProse.\n`
		);

	it('names a page that imports from $lib, and the import', async () => {
		const cwd = scratch();
		page(cwd, 'live', "import Counter from '$lib/examples/counter.svelte';");

		const output = await archive(cwd);
		expect(output).toContain('freeze boundary');
		expect(output).toContain('src/routes/docs/v1/live/+page.md');
		expect(output).toContain('$lib/examples/counter.svelte');
	});

	it('lists every offending page, not just the first', async () => {
		const cwd = scratch();
		page(cwd, 'live', "import Counter from '$lib/examples/counter.svelte';");
		page(cwd, 'gallery', "import Gallery from '$lib/components/gallery.svelte';");

		const output = await archive(cwd);
		expect(output).toContain('2 pages import across the freeze boundary');
		expect(output).toContain('src/routes/docs/v1/live/+page.md');
		expect(output).toContain('src/routes/docs/v1/gallery/+page.md');
	});

	// The library is the expected import, a sibling file is copied into the
	// archive alongside the page, and the tree's other pages have no script at all.
	it('says nothing when every import stays inside the boundary', async () => {
		const cwd = scratch();
		page(
			cwd,
			'safe',
			"import { Callout } from 'svelte-docsmith';\n\timport Demo from './demo.svelte';"
		);
		write(path.join(cwd, 'src/routes/docs/safe/demo.svelte'), '<p>demo</p>\n');

		expect(await archive(cwd)).not.toContain('freeze boundary');
	});

	it('is informational: the archive is written and the config still printed', async () => {
		const cwd = scratch();
		page(cwd, 'live', "import Counter from '$lib/examples/counter.svelte';");

		const output = await archive(cwd);
		expect(exists(cwd, `src/routes/docs/v1/${ARCHIVE_MARKER}`)).toBe(true);
		expect(output).toContain("archived: [{ id: 'v1', label: 'v1' }]");
	});
});

describe('archive-version failures', () => {
	it('rejects a missing id', async () => {
		const cwd = scratch();
		await expect(archive(cwd, ['archive-version'])).rejects.toThrow(CliError);
		await expect(archive(cwd, ['archive-version'])).rejects.toThrow(/missing <id>/);
	});

	// The same rule the vite plugin applies, so the command cannot create an
	// archive the build would then reject.
	it('rejects an id that is not safe as a directory or URL segment', async () => {
		const cwd = scratch();
		await expect(archive(cwd, ['archive-version', '../evil'])).rejects.toThrow(
			/invalid version id/
		);
		await expect(archive(cwd, ['archive-version', '.hidden'])).rejects.toThrow(
			/invalid version id/
		);
		expect(exists(cwd, 'src/routes/evil')).toBe(false);
	});

	it('refuses to overwrite an existing target', async () => {
		const cwd = scratch();
		await archive(cwd);
		await expect(archive(cwd)).rejects.toThrow(/target already exists/);
	});

	it('reports a content directory that is not there', async () => {
		const cwd = scratch({ content: 'nope' });
		await expect(archive(cwd)).rejects.toThrow(/content directory not found: nope/);
	});

	it('points the old directory flags at the docsmith() options', async () => {
		const cwd = scratch();
		await expect(archive(cwd, ['archive-version', 'v1', '--content', 'docs'])).rejects.toThrow(
			/--content is gone: the command reads `content` and `routes` from your docsmith\(\) options/
		);
	});

	it('needs a vite config with the docsmith() plugin', async () => {
		const cwd = scratch();
		fs.rmSync(path.join(cwd, 'vite.config.mjs'));
		await expect(archive(cwd)).rejects.toThrow(/no vite.config found here/);
		await expect(archive(cwd, ['archive-version', 'v1', '--config', 'x.mjs'])).rejects.toThrow(
			/config not found: x.mjs/
		);
		write(path.join(cwd, 'vite.config.mjs'), 'export default { plugins: [] };\n');
		await expect(archive(cwd)).rejects.toThrow(/vite.config.mjs has no docsmith\(\) plugin/);
	});

	// The build would reject it anyway; refusing first keeps the tree as it was.
	it('refuses to archive while the declared versions disagree with the tree', async () => {
		const cwd = scratch({
			versions: { current: { id: 'v3', label: 'v3' }, archived: [{ id: 'v2', label: 'v2' }] }
		});
		await expect(archive(cwd, ['archive-version', 'v1'])).rejects.toThrow(
			/declared but not archived on disk: `v2`/
		);
		expect(exists(cwd, 'src/routes/docs/v1')).toBe(false);
	});

	it('throws rather than exiting, so the shim owns the exit code', async () => {
		const cwd = scratch();
		try {
			await archive(cwd, ['archive-version']);
			expect.unreachable('should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(CliError);
		}
	});
});

describe('run', () => {
	it('prints help with no command', async () => {
		const lines: string[] = [];
		await run([], { log: (line) => lines.push(line) });
		expect(lines.join('\n')).toContain('svelte-docsmith archive-version <id>');
	});

	it('rejects an unknown command with the help text', async () => {
		await expect(run(['nope'], { log: () => {} })).rejects.toThrow(/unknown command: nope/);
	});
});
