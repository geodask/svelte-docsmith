/**
 * How the content plugin reports broken links, kept beside it so the plugin
 * stays about indexes. Which links are broken is `../links.js`; this decides
 * when to look and what to print.
 *
 * `vite build` checks links where the content index reads the pages, and
 * reports at the author's level. `vite dev` checks from the page watcher
 * instead, so it warns at startup and on every page change whether or not a
 * page that imports the index has been opened, and never throws: a link
 * half-typed while writing must not break the page being written.
 *
 * Like the plugin, the one layer here that prints to the console.
 */
import { brokenLinks, brokenLinksCount, brokenLinksReport, type BrokenLink } from '../links.js';
import type { IndexOptions } from './collect.js';
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
	/** From `configureServer`: the dev server's first check. */
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
	const warnInDev = () => {
		if (links.broken === 'ignore') return;
		let broken: BrokenLink[];
		try {
			broken = brokenLinks(readSourcePages(contentDir).pages, linkCheckOptions(), links.outside);
		} catch {
			// Frontmatter that doesn't parse, mid-edit. The content index reports
			// it with the page's name; checking links can wait for the next save.
			return;
		}
		const key = brokenLinksKey(broken);
		if (key === lastDevWarning) return;
		const hadWarned = lastDevWarning !== '';
		lastDevWarning = key;
		if (broken.length) console.warn(brokenLinksReport(broken));
		else if (hadWarned) console.info('[svelte-docsmith] no broken links left in doc pages');
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
		devStarted: warnInDev,
		fileChanged(file) {
			// No index reads a `+page.svelte`, but links to it count.
			if (isRouteFile(file, markdownExtensions)) warnInDev();
		}
	};
}
