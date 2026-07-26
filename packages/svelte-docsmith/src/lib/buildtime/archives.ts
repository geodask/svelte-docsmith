/**
 * What the docs root says about itself: which directories under it are archived
 * versions. The scan is deliberately thin, so the reconciliation it feeds
 * (`checkVersions`) stays pure and testable without a filesystem.
 *
 * Both callers cross this seam. The vite plugin scans before resolving versions;
 * `archive-version` scans so it knows which directories not to copy into the
 * archive it is writing.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { ArchivesOnDisk } from '../core/version.js';

/**
 * Written into every archive `archive-version` creates. Not a convenience for
 * the command: this file is what makes a directory an archived version rather
 * than an ordinary section of the current docs, and the build reads it. The two
 * are otherwise indistinguishable, since a page is assigned to a version by its
 * first directory segment. See
 * `docs/adr/0003-the-archive-marker-defines-an-archive.md`.
 */
export const ARCHIVE_MARKER = '.docsmith-archive';

/** The text written into a new archive's marker file. */
export function markerContents(id: string): string {
	return (
		`Archived docs for ${id}, created by \`svelte-docsmith archive-version\`.\n` +
		`This folder is frozen: edit the docs root instead.\n` +
		`Removing this file makes the build treat it as current-version content.\n`
	);
}

/**
 * The directories directly under `contentDir`, and which of them are archives.
 * An absent docs root reads as empty rather than throwing: the collectors
 * already report that case, and the command has its own message for it.
 */
export function discoverArchives(contentDir: string): ArchivesOnDisk {
	if (!fs.existsSync(contentDir)) return { marked: [], directories: [] };

	const directories = fs
		.readdirSync(contentDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);

	return {
		directories,
		marked: directories.filter((name) => fs.existsSync(path.join(contentDir, name, ARCHIVE_MARKER)))
	};
}
