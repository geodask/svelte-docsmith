import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { collectReleases } from './releases.js';
import { changelogDates } from './git.js';

let dir: string | undefined;

function scratch(): string {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-releases-'));
	return dir;
}

afterEach(() => {
	if (dir) fs.rmSync(dir, { recursive: true, force: true });
	dir = undefined;
});

const CHANGELOG = `# my-lib

## 1.1.0

### Minor Changes

- abc1234: Added a thing with \`code\` in it.

## 1.0.0

### Patch Changes

- def5678: Fixed a thing.
`;

describe('collectReleases', () => {
	it('reads releases and renders each entry to HTML', () => {
		const root = scratch();
		const file = path.join(root, 'CHANGELOG.md');
		fs.writeFileSync(file, CHANGELOG);

		const releases = collectReleases(file);
		expect(releases.map((r) => r.version)).toEqual(['1.1.0', '1.0.0']);
		// Markdown becomes HTML at build time so consuming sites need no renderer.
		expect(releases[0].groups[0].items[0]).toContain('<code>code</code>');
		expect(releases[0].groups[0].items[0]).not.toContain('abc1234');
	});

	it('links a release to a hand-written page when one exists', () => {
		const root = scratch();
		const file = path.join(root, 'CHANGELOG.md');
		fs.writeFileSync(file, CHANGELOG);
		const overrides = path.join(root, 'routes', 'changelog');
		fs.mkdirSync(path.join(overrides, '1.1.0'), { recursive: true });

		const releases = collectReleases(file, overrides);
		expect(releases[0].path).toBe('/changelog/1.1.0');
		expect(releases[1].path).toBeUndefined();
	});

	it('accepts a dash-separated directory name, since dots are awkward in paths', () => {
		const root = scratch();
		const file = path.join(root, 'CHANGELOG.md');
		fs.writeFileSync(file, CHANGELOG);
		const overrides = path.join(root, 'routes', 'changelog');
		fs.mkdirSync(path.join(overrides, '1-0-0'), { recursive: true });

		const releases = collectReleases(file, overrides);
		expect(releases[1].path).toBe('/changelog/1-0-0');
	});

	it('honours a custom changelog route', () => {
		const root = scratch();
		const file = path.join(root, 'CHANGELOG.md');
		fs.writeFileSync(file, CHANGELOG);
		const overrides = path.join(root, 'releases');
		fs.mkdirSync(path.join(overrides, '1.1.0'), { recursive: true });

		expect(collectReleases(file, overrides, '/releases')[0].path).toBe('/releases/1.1.0');
	});

	it('returns nothing when there is no changelog, rather than failing the build', () => {
		expect(collectReleases(path.join(scratch(), 'nope.md'))).toEqual([]);
	});

	it('tolerates an overrides directory that does not exist', () => {
		const root = scratch();
		const file = path.join(root, 'CHANGELOG.md');
		fs.writeFileSync(file, CHANGELOG);
		expect(collectReleases(file, path.join(root, 'missing')).length).toBe(2);
	});
});

describe('changelogDates', () => {
	it('dates each version from the commit that introduced its heading', () => {
		const root = scratch();
		const git = (...args: string[]) => spawnSync('git', args, { cwd: root, encoding: 'utf-8' });
		git('init', '-q');
		git('config', 'user.email', 'test@example.com');
		git('config', 'user.name', 'Test');

		const file = path.join(root, 'CHANGELOG.md');
		fs.writeFileSync(file, '# my-lib\n\n## 1.0.0\n\n### Patch Changes\n\n- Fixed.\n');
		git('add', 'CHANGELOG.md');
		git('commit', '-q', '-m', 'release 1.0.0');

		fs.writeFileSync(file, '# my-lib\n\n## 1.1.0\n\n### Minor Changes\n\n- Added.\n\n## 1.0.0\n');
		git('add', 'CHANGELOG.md');
		git('commit', '-q', '-m', 'release 1.1.0');

		const dates = changelogDates(file);
		expect(dates.get('1.0.0')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(dates.get('1.1.0')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		// 1.0.0's heading appeared first, so its date cannot be later than 1.1.0's.
		expect(Date.parse(dates.get('1.0.0')!)).toBeLessThanOrEqual(Date.parse(dates.get('1.1.0')!));
	});

	it('returns nothing outside a git repository, so releases simply carry no date', () => {
		const root = scratch();
		const file = path.join(root, 'CHANGELOG.md');
		fs.writeFileSync(file, CHANGELOG);
		expect(changelogDates(file).size).toBe(0);
	});
});
