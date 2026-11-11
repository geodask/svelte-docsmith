/**
 * The docs root, and what a page is before any index has looked at it. Reading
 * stops at a {@link SourcePage} list, which is the only value the index builders
 * in `./collect.js` see — so the same builders run against a real docs root in
 * the plugin and against an array of literals in tests.
 */
import fs from 'node:fs';
import path from 'node:path';
import { splitFrontmatter } from '../markdown-source.js';
import { readField } from './fields.js';
import { parseFrontmatter } from './frontmatter.js';

/**
 * One doc page as authored on disk, before any index-specific derivation. Its
 * URL, version, headings and search text are all derived from these fields, so
 * everything downstream of the read is pure.
 */
export type SourcePage = {
	/** Absolute path to the page file. */
	file: string;
	/** The page's raw markdown, frontmatter included. */
	source: string;
	/** The page's parsed frontmatter, `{}` when it has none. */
	frontmatter: Record<string, unknown>;
	/**
	 * Whether the page opens with a frontmatter block at all. `frontmatter` is
	 * `{}` either way, but only a page with a block is one the author configured.
	 */
	hasFrontmatter: boolean;
	/**
	 * The day (`YYYY-MM-DD`) the page last changed. Only {@link withCommitDates}
	 * fills this in, so it is absent on a page list that never went through it.
	 */
	lastUpdated?: string;
};

/**
 * Whether a file is a doc page: a `+page` file in one of the extensions
 * compiled as markdown (`markdown.extensions`, `['.md']` unless the author says
 * otherwise; see `markdownExtensions` in `../markdown.js`).
 *
 * The one rule for what a doc page is. The indexes, the dev watcher, the
 * broken-link check and the archive CLI all ask it with the compiler's own
 * extensions, so a page is indexed exactly when it is compiled.
 */
export function isDocPage(file: string, extensions: readonly string[]): boolean {
	const name = path.basename(file);
	return extensions.some((extension) => name === `+page${extension}`);
}

/**
 * Whether a file is a route SvelteKit serves as a page: a doc page, or a
 * `+page.svelte`. Wider than {@link isDocPage}: a `+page.svelte` is no doc
 * page, so no index reads it, but a link to it is still a link to a page. A
 * `+page.ts` or `+page.server.ts` alone renders nothing, so it doesn't count.
 */
export function isPageRoute(file: string, extensions: readonly string[]): boolean {
	return isDocPage(file, extensions) || path.basename(file) === '+page.svelte';
}

/**
 * The absolute path of every page route under `contentDir`, doc pages and
 * `+page.svelte` alike (see {@link isPageRoute}).
 */
export function listRouteFiles(contentDir: string, extensions: readonly string[]): string[] {
	return listFiles(contentDir, (name) => isPageRoute(name, extensions));
}

/**
 * Turn a page's path and raw markdown into a {@link SourcePage}. Pure, and
 * shared with tests so an in-memory page is built exactly the way a read one is.
 */
export function toPage(file: string, source: string): SourcePage {
	return {
		file,
		source,
		frontmatter: parseFrontmatter(source, file),
		hasFrontmatter: splitFrontmatter(source).frontmatter !== undefined
	};
}

/**
 * Read every doc page (see {@link isDocPage}) under `contentDir`. `exists` distinguishes a missing docs
 * root from an empty one, which the page list alone cannot: both give no pages,
 * but only one of them is a misconfiguration worth reporting.
 */
export function readSourcePages(
	contentDir: string,
	extensions: readonly string[]
): { pages: SourcePage[]; exists: boolean } {
	if (!fs.existsSync(contentDir)) return { pages: [], exists: false };
	const pages = listFiles(contentDir, (name) => isDocPage(name, extensions)).map((file) =>
		toPage(file, fs.readFileSync(file, 'utf-8'))
	);
	return { pages, exists: true };
}

/**
 * A page's title, when it has one. A page whose frontmatter has no string
 * `title` is a stub: no index carries it, so nothing is derived for it and
 * nothing is looked up about it.
 */
export function titleOf(page: SourcePage): string | undefined {
	return readField(page.frontmatter, 'title');
}

/**
 * Date each page from `dates`, keyed by absolute path, unless it carries its own
 * frontmatter `lastUpdated`. Archiving copies every page in one commit, so an
 * archive's pages are written with the date they last really changed and must
 * keep it.
 *
 * Pure: the caller walks git once with {@link commitDates} and hands the result
 * in. Asking per page cost a process each and was the build's largest single
 * expense, and doing the walk here would put it behind a function the search and
 * llms indexes also call, making them pay for a date neither has anywhere to put.
 * For the same reason this skips untitled pages, which no index carries.
 */
export function withCommitDates(pages: SourcePage[], dates: Map<string, string>): SourcePage[] {
	return pages.map((page) => {
		if (titleOf(page) === undefined) return page;
		return {
			...page,
			lastUpdated: readField(page.frontmatter, 'lastUpdated') ?? dates.get(page.file)
		};
	});
}

/** The absolute path of every file under `contentDir` whose name `wanted` accepts. */
function listFiles(contentDir: string, wanted: (name: string) => boolean): string[] {
	if (!fs.existsSync(contentDir)) return [];

	const entries = fs.readdirSync(contentDir, { recursive: true, withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !wanted(entry.name)) continue;
		const dir = entry.parentPath ?? (entry as { path?: string }).path ?? contentDir;
		files.push(path.join(dir, entry.name));
	}
	return files;
}
