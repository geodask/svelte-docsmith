/**
 * `svelte-docsmith archive-version <id>`: freeze the current docs into an
 * archived version folder so they keep serving the release they document while
 * the docs root goes on being edited.
 *
 * The pure text transforms live in `../archive.js`; this is the filesystem work
 * around them. It takes its working directory and its output sink rather than
 * reading `process.cwd()` and calling `console.log`, so the whole command runs
 * in-process under test. See `docs/adr/0002-archives-are-rewritten-source-copies.md`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { assertValidVersionId } from '../../core/version.js';
import {
	boundaryCrossings,
	freezeLastUpdated,
	isInheritedRouteFile,
	rewriteDocsLinks
} from '../archive.js';
import { ARCHIVE_MARKER, discoverArchives, markerContents } from '../archives.js';
import { commitDates } from '../git.js';
import { docsBaseFrom } from '../paths.js';
import { isPageFile } from '../vite/pages.js';
import { CliError } from './error.js';

export type ArchiveVersionOptions = {
	/** Id of the archive to create. Becomes its directory name and URL segment. */
	id: string;
	/** Switcher label for the archive. Defaults to the id. */
	label?: string;
	/** Docs content directory, resolved against `cwd`. */
	content?: string;
	/** SvelteKit routes directory, resolved against `cwd`. */
	routes?: string;
	/** Working directory the relative options resolve against. */
	cwd?: string;
};

/**
 * Copy the docs root into `<content>/<id>/`, mark it as an archive, and rewrite
 * each copied page so it stays inside the archive and keeps its real
 * last-updated date. Returns the number of pages archived.
 */
export function archiveVersion(
	options: ArchiveVersionOptions,
	log: (line: string) => void
): number {
	const cwd = options.cwd ?? process.cwd();
	const { id, label = options.id } = options;

	try {
		assertValidVersionId(id);
	} catch (error) {
		throw new CliError((error as Error).message);
	}

	const contentDir = path.resolve(cwd, options.content ?? 'src/routes/docs');
	const routesDir = path.resolve(cwd, options.routes ?? 'src/routes');
	const toDir = path.join(contentDir, id);
	const rel = (p: string) => path.relative(cwd, p);

	if (!fs.existsSync(contentDir)) {
		throw new CliError(`content directory not found: ${rel(contentDir)}`);
	}
	if (fs.existsSync(toDir)) {
		throw new CliError(`target already exists: ${rel(toDir)}`);
	}

	const docsBase = docsBaseFrom(routesDir, contentDir);
	// Archives already on disk, so this run neither copies them into the new
	// archive nor rewrites links that already point into one of them.
	const archivedIds = new Set(discoverArchives(contentDir).marked);

	/** Copy the docs root into the archive, skipping what the archive shouldn't hold. */
	function copyCurrent(from: string, to: string): void {
		fs.mkdirSync(to, { recursive: true });
		for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
			const src = path.join(from, entry.name);
			const dest = path.join(to, entry.name);
			if (entry.isDirectory()) {
				// Never descend into the archive being written (it lives inside the docs
				// root) or into an archive written by an earlier run.
				if (src === toDir) continue;
				if (from === contentDir && archivedIds.has(entry.name)) continue;
				copyCurrent(src, dest);
			} else {
				// The root layout and error page already apply to the archive, which is
				// nested inside them; copying them would nest a second DocsShell.
				if (from === contentDir && isInheritedRouteFile(entry.name)) continue;
				fs.copyFileSync(src, dest);
			}
		}
	}

	/** Every file in the archive, paired with the source file it was copied from. */
	function* eachCopiedFile(dir: string = toDir): Generator<{ file: string; source: string }> {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const file = path.join(dir, entry.name);
			if (entry.isDirectory()) yield* eachCopiedFile(file);
			else yield { file, source: path.join(contentDir, path.relative(toDir, file)) };
		}
	}

	// Read the dates before copying, so the walk sees the docs root as it was
	// rather than a tree half full of untracked copies. Say so if they could not
	// be read: an archive is written once and never edited again, so a page that
	// misses its date here keeps the wrong one for good.
	const dates = commitDates(contentDir, (reason) => {
		log(`\n! Could not read commit dates: ${reason}`);
		log('  Archived pages will keep no last-updated date.\n');
	});

	copyCurrent(contentDir, toDir);
	fs.writeFileSync(path.join(toDir, ARCHIVE_MARKER), markerContents(id));

	let pages = 0;
	/** One `path: specifiers` line per page that imports across the freeze boundary. */
	const crossings: string[] = [];

	for (const { file, source } of eachCopiedFile()) {
		if (!isPageFile(path.basename(file))) continue;
		pages++;
		const text = fs.readFileSync(file, 'utf-8');

		const pageDir = path.relative(toDir, path.dirname(file)).split(path.sep).join('/');
		const crossed = boundaryCrossings(text, pageDir);
		if (crossed.length) crossings.push(`    ${rel(file)}: ${crossed.join(', ')}`);

		fs.writeFileSync(
			file,
			freezeLastUpdated(
				rewriteDocsLinks(text, { docsBase, versionId: id, archivedIds }),
				dates.get(source)
			)
		);
	}

	log(`\n✓ Archived the current docs into ${rel(toDir)} (${pages} pages)\n`);
	log('Links were rewritten to stay inside the archive.');
	// Only claim the dates were kept when the walk actually produced some.
	if (dates.size) log('Each page kept its real last-updated date.');

	// Informational: the archive is correct as content, and there is nothing to
	// fix here. Said out loud because the alternative is a green build hiding a
	// v1 page that demos v2, which nothing downstream can notice.
	if (crossings.length) {
		const count = crossings.length === 1 ? '1 page' : `${crossings.length} pages`;
		log(`\n! ${count} import across the freeze boundary:`);
		crossings.sort().forEach(log);
		log('  Archiving copies the docs root, not what it imports, so these keep');
		log('  resolving to current code. Their examples will demonstrate the');
		log('  current library rather than the version this archive documents.\n');
	}

	log('Review the diff, then update docsmith({ versions }) so the archive');
	log('is served:\n');
	log('  versions: {');
	log("    current: { id: '<new release>', label: '<new release>' },");
	log(`    archived: [{ id: '${id}', label: '${label}' }${archivedIds.size ? ', …' : ''}]`);
	log('  }\n');
	// Until that paste lands the build fails, by design: the archive is on disk
	// and undeclared. See docs/adr/0003-the-archive-marker-defines-an-archive.md.
	log('Until then the build will fail, reporting this archive as undeclared.\n');

	return pages;
}
