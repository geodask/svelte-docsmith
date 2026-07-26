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
 * A minimal SvelteKit docs tree in a real git repo, since the command reads
 * commit dates. Two pages, one linking to the other, plus the root layout and
 * error page an archive is supposed to inherit rather than copy.
 */
function scratch(): string {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-cli-'));
	const docs = path.join(dir, 'src/routes/docs');

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
function archive(cwd: string, args: string[] = ['archive-version', 'v1']): string {
	const lines: string[] = [];
	run(args, { cwd, log: (line) => lines.push(line) });
	return lines.join('\n');
}

const read = (cwd: string, rel: string) => fs.readFileSync(path.join(cwd, rel), 'utf-8');
const exists = (cwd: string, rel: string) => fs.existsSync(path.join(cwd, rel));

describe('archive-version', () => {
	it('copies the docs root into the archive and marks it', () => {
		const cwd = scratch();
		archive(cwd);

		expect(exists(cwd, `src/routes/docs/v1/${ARCHIVE_MARKER}`)).toBe(true);
		expect(exists(cwd, 'src/routes/docs/v1/+page.md')).toBe(true);
		expect(exists(cwd, 'src/routes/docs/v1/theming/+page.md')).toBe(true);
		expect(exists(cwd, 'src/routes/docs/v1/guides/nested/+page.md')).toBe(true);
		// The docs root is untouched: archiving copies, it does not move.
		expect(exists(cwd, 'src/routes/docs/+page.md')).toBe(true);
	});

	// The archive is nested inside them already; copying would nest a second shell.
	it('leaves the inherited layout and error page behind', () => {
		const cwd = scratch();
		archive(cwd);
		expect(exists(cwd, 'src/routes/docs/v1/+layout.svelte')).toBe(false);
		expect(exists(cwd, 'src/routes/docs/v1/+error.svelte')).toBe(false);
	});

	// An absolute link resolves to the current docs forever, so a verbatim copy
	// would walk readers out of the archive with no banner.
	it('rewrites in-content docs links to stay inside the archive', () => {
		const cwd = scratch();
		archive(cwd);
		expect(read(cwd, 'src/routes/docs/v1/+page.md')).toContain('](/docs/v1/theming)');
		expect(read(cwd, 'src/routes/docs/+page.md')).toContain('](/docs/theming)');
	});

	// Every page is copied in one commit, so without freezing, the whole archive
	// would claim it was updated the day it was created.
	it('freezes each page’s real commit day into its frontmatter', () => {
		const cwd = scratch();
		archive(cwd);
		expect(read(cwd, 'src/routes/docs/v1/+page.md')).toMatch(/^lastUpdated: '\d{4}-\d{2}-\d{2}'$/m);
	});

	it('reports the page count and the config to paste', () => {
		const cwd = scratch();
		const output = archive(cwd);
		expect(output).toContain('(3 pages)');
		expect(output).toContain("archived: [{ id: 'v1', label: 'v1' }]");
	});

	it('uses --label for the switcher entry it prints', () => {
		const cwd = scratch();
		const output = archive(cwd, ['archive-version', 'v1', '--label', 'v1.x']);
		expect(output).toContain("{ id: 'v1', label: 'v1.x' }");
	});

	it('honours --content and --routes', () => {
		const cwd = scratch();
		fs.renameSync(path.join(cwd, 'src/routes'), path.join(cwd, 'app'));
		archive(cwd, ['archive-version', 'v1', '--content', 'app/docs', '--routes', 'app']);
		expect(exists(cwd, `app/docs/v1/${ARCHIVE_MARKER}`)).toBe(true);
		expect(read(cwd, 'app/docs/v1/+page.md')).toContain('](/docs/v1/theming)');
	});

	it('does not copy an earlier archive into a new one', () => {
		const cwd = scratch();
		archive(cwd, ['archive-version', 'v1']);
		archive(cwd, ['archive-version', 'v2']);

		expect(exists(cwd, 'src/routes/docs/v2/v1')).toBe(false);
		expect(discoverArchives(path.join(cwd, 'src/routes/docs')).marked.sort()).toEqual(['v1', 'v2']);
	});

	// A page in the docs root may already link into an existing archive.
	it('leaves links that already point at an archive alone', () => {
		const cwd = scratch();
		archive(cwd, ['archive-version', 'v1']);
		write(
			path.join(cwd, 'src/routes/docs/+page.md'),
			'---\ntitle: Intro\n---\n\nOld [docs](/docs/v1/theming).\n'
		);
		archive(cwd, ['archive-version', 'v2']);
		expect(read(cwd, 'src/routes/docs/v2/+page.md')).toContain('](/docs/v1/theming)');
	});

	it('mentions that the build fails until the config is pasted', () => {
		const cwd = scratch();
		expect(archive(cwd)).toMatch(/build will fail/);
	});
});

describe('archive-version failures', () => {
	it('rejects a missing id', () => {
		const cwd = scratch();
		expect(() => archive(cwd, ['archive-version'])).toThrow(CliError);
		expect(() => archive(cwd, ['archive-version'])).toThrow(/missing <id>/);
	});

	// The same rule the vite plugin applies, so the command cannot create an
	// archive the build would then reject.
	it('rejects an id that is not safe as a directory or URL segment', () => {
		const cwd = scratch();
		expect(() => archive(cwd, ['archive-version', '../evil'])).toThrow(/invalid version id/);
		expect(() => archive(cwd, ['archive-version', '.hidden'])).toThrow(/invalid version id/);
		expect(exists(cwd, 'src/routes/evil')).toBe(false);
	});

	it('refuses to overwrite an existing target', () => {
		const cwd = scratch();
		archive(cwd);
		expect(() => archive(cwd)).toThrow(/target already exists/);
	});

	it('reports a content directory that is not there', () => {
		const cwd = scratch();
		expect(() => archive(cwd, ['archive-version', 'v1', '--content', 'nope'])).toThrow(
			/content directory not found/
		);
	});

	it('throws rather than exiting, so the shim owns the exit code', () => {
		const cwd = scratch();
		try {
			archive(cwd, ['archive-version']);
			expect.unreachable('should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(CliError);
		}
	});
});

describe('run', () => {
	it('prints help with no command', () => {
		const lines: string[] = [];
		run([], { log: (line) => lines.push(line) });
		expect(lines.join('\n')).toContain('svelte-docsmith archive-version <id>');
	});

	it('rejects an unknown command with the help text', () => {
		expect(() => run(['nope'], { log: () => {} })).toThrow(/unknown command: nope/);
	});
});
