/**
 * The doc pages of one `docsmith()` call: which files they are, what they say,
 * and whether they are sound. The generated modules, the dev watcher and the
 * broken-link report all ask here, so none of them reads the docs root or
 * decides what a doc page is for itself.
 *
 *  - **One rule** for what a doc page is: `isDocPage` in `./pages.js`, with
 *    the extensions the markdown compiler compiles.
 *  - **One read** per build, and per change in `dev`: {@link DocPages.read}
 *    keeps the pages until {@link DocPages.changed} says a file moved.
 *  - **One order** for the checks, in {@link DocPages.sound}: the versions
 *    against the archives on disk, then the outside paths, then the
 *    frontmatter, then (in a build) the links. Each needs the one before it to
 *    have passed to mean anything.
 *
 * `vite dev` also checks from here as files change, so it warns at startup and
 * on every page change whether or not a page that imports the content index
 * has been opened, and never throws: a link half-typed while writing must not
 * break the page being written.
 *
 * With `./broken-links.js` and `./generated-modules.js`, one of the layers
 * that prints to the console.
 */
import { checkVersions } from '../../core/version.js';
import { ARCHIVE_MARKER, discoverArchives } from '../archives.js';
import { markdownExtensions } from '../markdown.js';
import { checkOutsidePaths } from '../outside-paths.js';
import { brokenLinksReporter } from './broken-links.js';
import { checkFrontmatter } from './frontmatter-schema.js';
import { FrontmatterError } from './frontmatter.js';
import type { ResolvedDocsmithOptions } from './options.js';
import { isDocPage, isPageRoute, readSourcePages, type SourcePage } from './pages.js';

/** The docs root as read: `exists` tells a missing root from an empty one. */
export type ReadPages = { pages: SourcePage[]; exists: boolean };

export type DocPages = {
	/** Whether `file` is one of the site's doc pages, by its name alone. */
	isDocPage(file: string): boolean;
	/** From `configResolved`: whether this is `vite build` or `vite dev`. Build until told. */
	command(command: string): void;
	/**
	 * Every doc page under the docs root, read once and kept until
	 * {@link changed}. Throws a `FrontmatterError` on frontmatter that isn't
	 * YAML, and reads again next time.
	 */
	read(): ReadPages;
	/**
	 * The pages, once they are known to be sound. Rejects on the first check
	 * that fails, in the order above; in a build that includes broken links at
	 * the `error` level, which are printed before it rejects. Checked once per
	 * read, so every caller gets the one answer.
	 */
	sound(): Promise<ReadPages>;
	/** From `configureServer`: the dev server's first check. Prints, never throws. */
	devStarted(): void;
	/**
	 * A file was added, changed or removed while Vite watches. Forgets what was
	 * read, checks the links again in `dev` when a page route moved, and returns
	 * whether the file is a doc page, which is when the indexes built from them
	 * are stale.
	 */
	changed(file: string): boolean;
};

export function docPages(options: ResolvedDocsmithOptions): DocPages {
	const { contentDir, routesDir, versions, links } = options;
	const extensions = markdownExtensions(options.markdown);
	const report = brokenLinksReporter({
		indexOptions: { contentDir, routesDir, versions, math: options.markdown?.math },
		links,
		markdownExtensions: extensions
	});

	let building = true;
	let pagesRead: ReadPages | undefined;
	let checked: Promise<ReadPages> | undefined;

	const read = () => (pagesRead ??= readSourcePages(contentDir, extensions));

	const check = async (): Promise<ReadPages> => {
		// Before anything is read: a config that disagrees with the docs root
		// produces an index that is wrong rather than empty, so it has to fail
		// here rather than render.
		checkVersions(versions, discoverArchives(contentDir), ARCHIVE_MARKER);
		const result = read();
		// A page under an outside path contradicts the config whether or not
		// links are checked, so this runs under `broken: 'ignore'` too.
		checkOutsidePaths(result.pages, { routesDir }, links.outside);
		const typos = await checkFrontmatter(result.pages, options.schema);
		if (typos) console.warn(typos);
		// `vite dev` reports links from the watcher instead, and never throws.
		if (building) report.atBuild(result.pages);
		return result;
	};

	/**
	 * One dev check, which prints and never throws. At startup it reports a doc
	 * page under an outside path too, whatever the level: the config
	 * contradicts itself either way, and {@link DocPages.sound} only rejects on
	 * it once a page loads the content index. After that the index re-checks on
	 * every reload, so a change only checks links.
	 */
	const checkInDev = (startup: boolean) => {
		const outsidePaths = startup && links.outside.length > 0;
		if (!outsidePaths && links.broken === 'ignore') return;
		try {
			const { pages } = read();
			if (outsidePaths) {
				try {
					checkOutsidePaths(pages, { routesDir }, links.outside);
				} catch (error) {
					console.error(error instanceof Error ? error.message : String(error));
				}
			}
			report.inDev(pages);
		} catch (error) {
			// Frontmatter that doesn't parse, mid-edit. The content index reports
			// it with the page's name; checking links can wait for the next save.
			if (error instanceof FrontmatterError) return;
			// Anything else is a fault the author can't see any other way.
			const reason = error instanceof Error ? (error.stack ?? error.message) : String(error);
			console.error(`[svelte-docsmith] could not check doc pages for broken links\n${reason}`);
		}
	};

	return {
		isDocPage: (file) => isDocPage(file, extensions),
		command(command) {
			building = command === 'build';
		},
		read,
		sound: () => (checked ??= check()),
		devStarted() {
			checkInDev(true);
		},
		changed(file) {
			// Any file: an archive marker or a `+page.svelte` changes what the
			// checks say without being a doc page, and reading again is cheap.
			pagesRead = undefined;
			checked = undefined;
			// No index reads a `+page.svelte`, but links to it count. A build
			// reports links from `sound` instead.
			if (!building && isPageRoute(file, extensions)) checkInDev(false);
			return isDocPage(file, extensions);
		}
	};
}
