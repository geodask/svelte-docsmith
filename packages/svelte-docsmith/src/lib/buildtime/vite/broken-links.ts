/**
 * How the content plugin reports broken links, kept beside it so the plugin
 * stays about indexes. Which links are broken is `../links.js`; this decides
 * when to look and what to print.
 *
 * `vite build` checks links where the content index reads the pages, and
 * reports at the author's level. `vite dev` checks from the page watcher
 * instead, so it warns at startup and on every page change whether or not a
 * page that imports the index has been opened, and never throws: a link
 * half-typed while writing must not break the page being written. Its first
 * check also reports a doc page under an outside path, which the content index
 * otherwise only throws on once a page first loads it.
 *
 * Like the plugin, the one layer here that prints to the console.
 */
import { brokenLinks, brokenLinksCount, brokenLinksReport, type BrokenLink } from '../links.js';
import { checkOutsidePaths } from '../outside-paths.js';
import type { IndexOptions } from './collect.js';
import { FrontmatterError } from './frontmatter.js';
import type { ResolvedLinksOptions } from './options.js';
import { isRouteFile, listRouteFiles, readSourcePages, type SourcePage } from './pages.js';

/** What the reporter needs to know about the site to check its links. */
export type BrokenLinksReporterOptions = {
	/** Where the pages live, and the versions they belong to. */
	indexOptions: IndexOptions;
	/** The resolved `links` options: the level, and the outside paths. */
	links: ResolvedLinksOptions;
	/** The extensions compiled as markdown, so a `+page.<ext>` counts as a route. */
	markdownExtensions: string[];
};

/** The content plugin's hooks into broken-link reporting, one per moment it reports. */
export type BrokenLinksReporter = {
	/** From `configResolved`: whether this is `vite build` or `vite dev`. */
	configResolved(command: string): void;
	/** From the content index's load, with the pages it read: reports during `vite build` only. */
	pagesRead(pages: SourcePage[]): void;
	/** From `configureServer`: the dev server's first check, of outside paths too. */
	devStarted(): void;
	/** From the dev page watcher, for every file added, changed or removed under the docs root. */
	fileChanged(file: string): void;
};

/**
 * Which broken links a dev warning is about, ignoring their lines: editing the
 * text above a broken link moves it, and warning again for that would repeat
 * what the author already saw.
 */
const brokenLinksKey = (broken: BrokenLink[]) =>
	broken.map(({ file, link, problem }) => JSON.stringify([file, link, problem])).join('\n');

/**
 * Report broken links found during `vite build`, at the level the author chose.
 * Under `error` the report is printed before throwing, so the build log shows
 * every broken link at once rather than one per failed build.
 */
function reportBrokenLinks(broken: BrokenLink[], level: 'error' | 'warn') {
	if (!broken.length) return;
	const report = brokenLinksReport(broken);
	if (level === 'warn') {
		console.warn(report);
		return;
	}
	console.error(report);
	throw new Error(
		`[svelte-docsmith] ${brokenLinksCount(broken)} in doc pages, listed above. Fix them, or set ` +
			"`links: { broken: 'warn' }` in docsmith() to build anyway."
	);
}

/** The broken-link reporting of one content plugin. */
export function brokenLinksReporter({
	indexOptions,
	links,
	markdownExtensions
}: BrokenLinksReporterOptions): BrokenLinksReporter {
	const { contentDir } = indexOptions;
	// A link to a `+page.svelte` beside the doc pages is a link to a page too.
	// Listed afresh on every check, as the pages are read afresh.
	const linkCheckOptions = () => ({
		...indexOptions,
		pageRoutes: listRouteFiles(contentDir, markdownExtensions)
	});

	let building = true;
	let lastDevWarning = '';
	const warnAboutBrokenLinks = (pages: SourcePage[]) => {
		const broken = brokenLinks(pages, linkCheckOptions(), links.outside);
		const key = brokenLinksKey(broken);
		if (key === lastDevWarning) return;
		const hadWarned = lastDevWarning !== '';
		lastDevWarning = key;
		if (broken.length) console.warn(brokenLinksReport(broken));
		else if (hadWarned) console.info('[svelte-docsmith] no broken links left in doc pages');
	};

	/**
	 * One dev check, which prints and never throws. At startup it reports a doc
	 * page under an outside path too, whatever the level: the config
	 * contradicts itself either way, and the content index only throws on it
	 * once a page loads the index. After that the index re-checks on every
	 * reload, so the watcher only checks links.
	 */
	const checkInDev = (startup: boolean) => {
		const outsidePaths = startup && links.outside.length > 0;
		if (!outsidePaths && links.broken === 'ignore') return;
		try {
			const { pages } = readSourcePages(contentDir);
			if (outsidePaths) {
				try {
					checkOutsidePaths(pages, indexOptions, links.outside);
				} catch (error) {
					console.error(error instanceof Error ? error.message : String(error));
				}
			}
			if (links.broken !== 'ignore') warnAboutBrokenLinks(pages);
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
		configResolved(command) {
			building = command === 'build';
		},
		pagesRead(pages) {
			// Once per build, with the pages already read.
			if (building && links.broken !== 'ignore') {
				reportBrokenLinks(brokenLinks(pages, linkCheckOptions(), links.outside), links.broken);
			}
		},
		devStarted() {
			checkInDev(true);
		},
		fileChanged(file) {
			// No index reads a `+page.svelte`, but links to it count.
			if (isRouteFile(file, markdownExtensions)) checkInDev(false);
		}
	};
}
