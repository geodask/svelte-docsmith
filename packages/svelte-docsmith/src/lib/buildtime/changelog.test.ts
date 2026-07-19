import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseChangelog } from './changelog.js';

describe('parseChangelog', () => {
	it('reads versions and their groups', () => {
		const releases = parseChangelog(`# pkg

## 1.1.0

### Minor Changes

- abc1234: Added a thing.

## 1.0.1

### Patch Changes

- def5678: Fixed a thing.
`);
		expect(releases.map((r) => r.version)).toEqual(['1.1.0', '1.0.1']);
		expect(releases[0].groups).toEqual([{ kind: 'Minor Changes', items: ['Added a thing.'] }]);
		expect(releases[1].groups[0].kind).toBe('Patch Changes');
	});

	it('strips the changeset commit hash but keeps a bullet without one', () => {
		const [release] = parseChangelog(`## 1.0.0

### Patch Changes

- 4a1b3d4: With a hash.
- Without a hash.
`);
		expect(release.groups[0].items).toEqual(['With a hash.', 'Without a hash.']);
	});

	it('keeps a multi-paragraph entry together and de-indents it', () => {
		const [release] = parseChangelog(`## 1.0.0

### Minor Changes

- abc1234: First paragraph.

  Second paragraph.

- def5678: A separate entry.
`);
		expect(release.groups[0].items).toEqual([
			'First paragraph.\n\nSecond paragraph.',
			'A separate entry.'
		]);
	});

	it('preserves nested list markup inside an entry', () => {
		const [release] = parseChangelog(`## 1.0.0

### Minor Changes

- abc1234: Adds markers:

  - **Diff** for changes
  - **Focus** for emphasis
`);
		expect(release.groups[0].items[0]).toContain('- **Diff** for changes');
		expect(release.groups[0].items[0]).toContain('- **Focus** for emphasis');
	});

	it('holds several groups within one release', () => {
		const [release] = parseChangelog(`## 1.0.0

### Minor Changes

- a1b2c3d: A feature.

### Patch Changes

- d4e5f6a: A fix.
`);
		expect(release.groups.map((g) => g.kind)).toEqual(['Minor Changes', 'Patch Changes']);
	});

	it('drops an empty group rather than rendering a bare heading', () => {
		const [release] = parseChangelog(`## 1.0.0

### Minor Changes

### Patch Changes

- a1b2c3d: A fix.
`);
		expect(release.groups.map((g) => g.kind)).toEqual(['Patch Changes']);
	});

	it('ignores the package-name h1 and returns nothing for an empty changelog', () => {
		expect(parseChangelog('# just-a-name\n')).toEqual([]);
		expect(parseChangelog('')).toEqual([]);
	});

	it('parses this package’s real CHANGELOG.md', () => {
		const here = path.dirname(fileURLToPath(import.meta.url));
		const file = path.resolve(here, '../../../CHANGELOG.md');
		const releases = parseChangelog(fs.readFileSync(file, 'utf-8'));

		// Every release has a version and at least one non-empty group.
		expect(releases.length).toBeGreaterThan(5);
		for (const release of releases) {
			expect(release.version).toMatch(/^\d+\.\d+\.\d+/);
			expect(release.groups.length).toBeGreaterThan(0);
			for (const group of release.groups) expect(group.items.length).toBeGreaterThan(0);
		}
		// No entry should still carry a raw commit hash prefix.
		const items = releases.flatMap((r) => r.groups.flatMap((g) => g.items));
		expect(items.some((i) => /^[0-9a-f]{7,40}:/.test(i))).toBe(false);
	});
});
