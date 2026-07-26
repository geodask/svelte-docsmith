import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { commitDates } from './git.js';

let root: string | undefined;

afterEach(() => {
	if (root) fs.rmSync(root, { recursive: true, force: true });
	root = undefined;
});

/**
 * A real repository with a known history, so these assert against dates the test
 * chose rather than against whatever this checkout happens to contain.
 */
function repo(): string {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-git-'));

	spawnSync('git', ['init', '-q'], { cwd: root });
	spawnSync('git', ['config', 'user.email', 't@t'], { cwd: root });
	spawnSync('git', ['config', 'user.name', 't'], { cwd: root });

	write('docs/+page.md', 'intro\n');
	write('docs/deep/nested/+page.md', 'nested\n');
	commitOn(root, 'first', '2020-01-02');

	// A second, later commit touching only one of them, so the two pages end up
	// with different dates and a newest-wins bug cannot pass unnoticed.
	write('docs/+page.md', 'intro, revised\n');
	commitOn(root, 'second', '2024-06-07');

	return root;
}

function write(rel: string, text: string) {
	const file = path.join(root!, rel);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, text);
}

/**
 * `%cs` reads the *committer* day, so pin that rather than the author date
 * `--date` sets, which git would otherwise leave as today for every commit.
 */
function commitOn(dir: string, message: string, day: string) {
	spawnSync('git', ['add', '-A'], { cwd: dir });
	spawnSync('git', ['commit', '-q', '--allow-empty', '-m', message], {
		cwd: dir,
		encoding: 'utf-8',
		env: {
			...process.env,
			GIT_COMMITTER_DATE: `${day}T00:00:00`,
			GIT_AUTHOR_DATE: `${day}T00:00:00`
		}
	});
}

describe('commitDates', () => {
	it('maps every tracked file under the directory, however deeply nested', () => {
		const dir = repo();

		const dates = commitDates(path.join(dir, 'docs'));

		expect([...dates.keys()].sort()).toEqual(
			[
				path.join(dir, 'docs', '+page.md'),
				path.join(dir, 'docs', 'deep', 'nested', '+page.md')
			].sort()
		);
	});

	it('gives each file the day of the newest commit that touched it', () => {
		const dir = repo();

		const dates = commitDates(path.join(dir, 'docs'));

		// The second commit touched only the first page; the nested one keeps the
		// day it was actually last changed rather than the newest day in the walk.
		expect(dates.get(path.join(dir, 'docs', '+page.md'))).toBe('2024-06-07');
		expect(dates.get(path.join(dir, 'docs', 'deep', 'nested', '+page.md'))).toBe('2020-01-02');
	});

	it('keys the map by absolute path, so a caller can look up the file it holds', () => {
		const dir = repo();

		for (const key of commitDates(path.join(dir, 'docs')).keys()) {
			expect(path.isAbsolute(key)).toBe(true);
		}
	});

	it('returns an empty map outside a repository', () => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-git-'));
		fs.writeFileSync(path.join(root, '+page.md'), '# loose\n');

		expect(commitDates(root).size).toBe(0);
	});

	// A missing docs root is reported by the plugin, in terms the author can act
	// on; a git error here would only add noise ahead of it.
	it('reports nothing for a directory that does not exist', () => {
		const onFail = vi.fn();

		const dates = commitDates(path.join(os.tmpdir(), 'docsmith-not-here'), onFail);

		expect(dates.size).toBe(0);
		expect(onFail).not.toHaveBeenCalled();
	});

	it('stays quiet outside a repository, which is a choice rather than a failure', () => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-git-'));
		const onFail = vi.fn();

		commitDates(root, onFail);

		expect(onFail).not.toHaveBeenCalled();
	});

	// The one failure worth reporting: the read is truncated rather than refused,
	// so without this the map would silently hold dates for only some pages.
	it('reports a read that outgrew the output buffer, and returns no dates at all', () => {
		const dir = repo();
		const onFail = vi.fn();

		// A cap the two-commit history above is certain to exceed. Partial dates
		// would be worse than none, so nothing at all comes back.
		const dates = commitDates(path.join(dir, 'docs'), onFail, 8);

		expect(dates.size).toBe(0);
		expect(onFail).toHaveBeenCalledTimes(1);
	});
});
