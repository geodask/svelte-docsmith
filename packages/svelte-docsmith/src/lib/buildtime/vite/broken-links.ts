/**
 * How broken links are reported. Which links are broken is `../links.js`, and
 * when to look is `./doc-pages.js`; this decides what to print.
 *
 * `vite build` reports at the author's level, failing the build under `error`.
 * `vite dev` only ever warns, and only when the set of broken links changed.
 *
 * With `./doc-pages.js`, a layer that prints to the console.
 */
import { brokenLinks, brokenLinksCount, brokenLinksReport, type BrokenLink } from '../links.js';
import type { IndexOptions } from './collect.js';
import type { ResolvedLinksOptions } from './options.js';
import { listRouteFiles, type SourcePage } from './pages.js';

/** What the reporter needs to know about the site to check its links. */
export type BrokenLinksReporterOptions = {
	/** Where the pages live, and the versions they belong to. */
	indexOptions: IndexOptions;
	/** The resolved `links` options: the level, and the outside paths. */
	links: ResolvedLinksOptions;
	/** The extensions compiled as markdown, so a `+page.<ext>` counts as a route. */
	markdownExtensions: string[];
};

export type BrokenLinksReporter = {
	/** `vite build`: print every broken link at the author's level, and throw under `error`. */
	atBuild(pages: SourcePage[]): void;
	/**
	 * `vite dev`: warn when the set of broken links changed since the last
	 * call, and say so when none are left. Never throws.
	 */
	inDev(pages: SourcePage[]): void;
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

/** The broken-link reporting of one `docsmith()` call. */
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

	let lastDevWarning = '';

	return {
		atBuild(pages) {
			if (links.broken === 'ignore') return;
			reportBrokenLinks(brokenLinks(pages, linkCheckOptions(), links.outside), links.broken);
		},
		inDev(pages) {
			if (links.broken === 'ignore') return;
			const broken = brokenLinks(pages, linkCheckOptions(), links.outside);
			const key = brokenLinksKey(broken);
			if (key === lastDevWarning) return;
			const hadWarned = lastDevWarning !== '';
			lastDevWarning = key;
			if (broken.length) console.warn(brokenLinksReport(broken));
			else if (hadWarned) console.info('[svelte-docsmith] no broken links left in doc pages');
		}
	};
}
