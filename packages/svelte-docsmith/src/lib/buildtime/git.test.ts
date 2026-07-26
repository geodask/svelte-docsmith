import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { commitDates } from './git.js';

/** A directory this repo tracks, so git really has commits for what is in it. */
const TRACKED_DIR = path.resolve('src/lib/buildtime');

let root: string;

afterEach(() => {
	if (root) fs.rmSync(root, { recursive: true, force: true });
});

describe('commitDates', () => {
	it('maps every tracked file under the directory to a commit day', () => {
		const dates = commitDates(TRACKED_DIR);

		expect(dates.get(path.join(TRACKED_DIR, 'git.ts'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(dates.get(path.join(TRACKED_DIR, 'vite', 'pages.ts'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('keys the map by absolute path, so a caller can look up the file it holds', () => {
		const dates = commitDates(TRACKED_DIR);

		for (const key of dates.keys()) expect(path.isAbsolute(key)).toBe(true);
	});

	it('returns an empty map outside a repository', () => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-root-'));
		fs.writeFileSync(path.join(root, '+page.md'), '# loose\n');

		expect(commitDates(root).size).toBe(0);
	});

	it('returns an empty map for a directory that does not exist', () => {
		expect(commitDates(path.join(os.tmpdir(), 'docsmith-not-here')).size).toBe(0);
	});
});
