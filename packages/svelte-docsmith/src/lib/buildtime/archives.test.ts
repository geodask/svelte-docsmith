import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ARCHIVE_MARKER, discoverArchives, markerContents } from './archives.js';

let dir: string | undefined;

afterEach(() => {
	if (dir) fs.rmSync(dir, { recursive: true, force: true });
	dir = undefined;
});

/** A docs root with `marked` archive directories and `plain` section directories. */
function scratch(marked: string[], plain: string[] = []): string {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-archives-'));
	for (const name of marked) {
		fs.mkdirSync(path.join(dir, name), { recursive: true });
		fs.writeFileSync(path.join(dir, name, ARCHIVE_MARKER), markerContents(name));
	}
	for (const name of plain) fs.mkdirSync(path.join(dir, name), { recursive: true });
	return dir;
}

describe('discoverArchives', () => {
	it('finds the marked directories', () => {
		expect(discoverArchives(scratch(['v1', 'v0'])).marked.sort()).toEqual(['v0', 'v1']);
	});

	// The whole point of the marker: a section folder and an archive folder are
	// the same shape otherwise. See docs/adr/0003.
	it('does not mistake an unmarked section folder for an archive', () => {
		const root = scratch(['v1'], ['guides', 'concepts']);
		const disk = discoverArchives(root);
		expect(disk.marked).toEqual(['v1']);
		expect(disk.directories.sort()).toEqual(['concepts', 'guides', 'v1']);
	});

	// checkVersions needs this to tell "no folder at all" from "folder, no marker".
	it('reports every directory, marked or not', () => {
		expect(discoverArchives(scratch([], ['guides'])).directories).toEqual(['guides']);
	});

	it('ignores files at the docs root', () => {
		const root = scratch(['v1']);
		fs.writeFileSync(path.join(root, '+layout.svelte'), '<slot />\n');
		expect(discoverArchives(root).directories).toEqual(['v1']);
	});

	it('reads an absent docs root as empty rather than throwing', () => {
		expect(discoverArchives(path.join(os.tmpdir(), 'docsmith-does-not-exist'))).toEqual({
			marked: [],
			directories: []
		});
	});

	it('tells the reader the folder is frozen and what removing the marker does', () => {
		expect(markerContents('v1')).toContain('Archived docs for v1');
		expect(markerContents('v1')).toMatch(/frozen/);
		expect(markerContents('v1')).toMatch(/current-version content/);
	});
});
