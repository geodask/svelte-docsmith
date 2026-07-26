/**
 * The docs root, and what a page is before any index has looked at it. Reading
 * stops at a {@link SourcePage} list, which is the only value the index builders
 * in `./collect.js` see — so the same builders run against a real docs root in
 * the plugin and against an array of literals in tests.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './frontmatter.js';
import { lastCommitDate } from '../git.js';

const PAGE_NAMES = ['+page.md', '+page.svx'];

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
	 * The day (`YYYY-MM-DD`) the page last changed. Only {@link withCommitDates}
	 * fills this in, so it is absent on a page list that never went through it.
	 */
	lastUpdated?: string;
};

/** Whether a filename is a doc page the plugin should index. */
export function isPageFile(file: string): boolean {
	return PAGE_NAMES.some((name) => file.endsWith(name));
}

/**
 * Turn a page's path and raw markdown into a {@link SourcePage}. Pure, and
 * shared with tests so an in-memory page is built exactly the way a read one is.
 */
export function toPage(file: string, source: string): SourcePage {
	return { file, source, frontmatter: parseFrontmatter(source, file) };
}

/**
 * Read every doc page under `contentDir`. `exists` distinguishes a missing docs
 * root from an empty one, which the page list alone cannot: both give no pages,
 * but only one of them is a misconfiguration worth reporting.
 */
export function readSourcePages(contentDir: string): { pages: SourcePage[]; exists: boolean } {
	if (!fs.existsSync(contentDir)) return { pages: [], exists: false };
	const pages = listPageFiles(contentDir).map((file) =>
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
	return typeof page.frontmatter.title === 'string' ? page.frontmatter.title : undefined;
}

/**
 * Date each page from the commit that last touched it, skipping the lookup for
 * pages that carry their own `lastUpdated`. Archiving copies every page in one
 * commit, so an archive's pages are written with the date they last really
 * changed and must keep it.
 *
 * Deliberately a second pass rather than part of {@link readSourcePages}: it
 * spawns a git process per page, and only the content index has a date field.
 * Folding it into the read would make the search and llms indexes pay for a
 * value neither of them has anywhere to put. For the same reason it skips
 * untitled pages, which no index carries.
 */
export function withCommitDates(pages: SourcePage[]): SourcePage[] {
	return pages.map((page) => {
		if (titleOf(page) === undefined) return page;
		return {
			...page,
			lastUpdated:
				typeof page.frontmatter.lastUpdated === 'string'
					? page.frontmatter.lastUpdated
					: lastCommitDate(page.file)
		};
	});
}

/**
 * List the absolute paths of every `+page.md`/`+page.svx` under `contentDir`.
 */
export function listPageFiles(contentDir: string): string[] {
	if (!fs.existsSync(contentDir)) return [];

	const entries = fs.readdirSync(contentDir, { recursive: true, withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !isPageFile(entry.name)) continue;
		const dir = entry.parentPath ?? (entry as { path?: string }).path ?? contentDir;
		files.push(path.join(dir, entry.name));
	}
	return files;
}
