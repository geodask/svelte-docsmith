import fs from 'node:fs';
import path from 'node:path';
import type { DocsContentItem, LlmsDoc, SearchDoc } from '$lib/core/content.js';
import type { DocsVersions } from '$lib/core/version.js';
import { listPageFiles } from './pages.js';
import { parseFrontmatter } from './frontmatter.js';
import { extractLlmsContent, extractSearchText, extractToc, readingMinutes } from './extract.js';
import { lastCommitDate } from './git.js';

type PageEntry = {
	source: string;
	front: Record<string, unknown>;
	url: string;
	title: string;
	file: string;
	/** Version id when the page sits under a declared version folder, else undefined. */
	version: string | undefined;
};

/**
 * Read a page's `section` frontmatter: a string is one level, an array is a
 * nested group path. Non-string array members are dropped; anything else is
 * treated as no section.
 */
function readSection(value: unknown): string | string[] | undefined {
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) {
		const segs = value.filter((s): s is string => typeof s === 'string');
		return segs.length ? segs : undefined;
	}
	return undefined;
}

/** The most-specific (last) group segment, for the compact search-result pill. */
function sectionLabel(value: unknown): string | undefined {
	const section = readSection(value);
	if (section === undefined) return undefined;
	return Array.isArray(section) ? section[section.length - 1] : section;
}

/** The full group path joined, so nested pages group under one llms.txt heading. */
function sectionKey(value: unknown): string | undefined {
	const section = readSection(value);
	if (section === undefined) return undefined;
	return Array.isArray(section) ? section.join(' / ') : section;
}

/**
 * Walk every nav-worthy page under `contentDir` once: a page is nav-worthy when
 * its frontmatter has a string `title`. Yields the raw source, parsed
 * frontmatter, derived URL, and title so every index (nav, search, llms) can be
 * built from a single read of each file.
 */
function* eachTitledPage(
	contentDir: string,
	routesDir: string,
	versions: DocsVersions | undefined
): Generator<PageEntry> {
	for (const file of listPageFiles(contentDir)) {
		const source = fs.readFileSync(file, 'utf-8');
		const front = parseFrontmatter(source, file);
		if (typeof front.title !== 'string') continue;

		const dir = path.dirname(file);
		const url = '/' + path.relative(routesDir, dir).split(path.sep).join('/');
		yield { source, front, url, title: front.title, file, version: versionOf(dir) };
	}

	/**
	 * A page belongs to an archived version when its first directory segment under
	 * the content dir is that archive's id; everything else is the current
	 * version, which lives unprefixed at the docs root. No versions ⇒ undefined,
	 * which keeps an unversioned site's index byte-for-byte what it was.
	 */
	function versionOf(dir: string): string | undefined {
		if (!versions) return undefined;
		const firstSegment = path.relative(contentDir, dir).split(path.sep)[0];
		const archived = versions.archived?.find((v) => v.id === firstSegment);
		return archived ? archived.id : versions.current.id;
	}
}

/**
 * Scan `contentDir` for `+page.md`/`+page.svx` files and read the frontmatter
 * fields the sidebar needs (plus the heading list for a server-rendered TOC and
 * an estimated reading time), deriving each page's URL from its directory
 * relative to `routesDir`. Pure and synchronous so it can be unit-tested.
 */
export function collectDocs(
	contentDir: string,
	routesDir: string,
	versions?: DocsVersions
): DocsContentItem[] {
	if (!fs.existsSync(contentDir)) {
		console.warn(
			`[svelte-docsmith] content directory not found: ${contentDir}\n` +
				`  The sidebar will be empty. Create your doc pages there, or point docsmith() at the right place with \`content\`.`
		);
		return [];
	}

	const items: DocsContentItem[] = [];

	for (const { source, front, url, title, file, version } of eachTitledPage(
		contentDir,
		routesDir,
		versions
	)) {
		items.push({
			title,
			path: url,
			description: typeof front.description === 'string' ? front.description : undefined,
			section: readSection(front.section),
			order: typeof front.order === 'number' ? front.order : undefined,
			sourcePath: path.relative(process.cwd(), file).split(path.sep).join('/'),
			// Frontmatter wins over git so an archived page keeps the date it last
			// really changed: archiving copies every page in one commit, which would
			// otherwise stamp the whole archive with the day it was created.
			lastUpdated: typeof front.lastUpdated === 'string' ? front.lastUpdated : lastCommitDate(file),
			readingTime: readingMinutes(extractSearchText(source)),
			toc: extractToc(source),
			version
		});
	}

	if (items.length === 0) {
		console.warn(
			`[svelte-docsmith] no doc pages found under ${contentDir}\n` +
				`  Add \`+page.md\` files with at least a \`title:\` in their frontmatter to populate the sidebar.`
		);
	}

	// Stable output keeps the generated module diff-friendly across rebuilds.
	return items.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Build the search records for every page under `contentDir`: title, section,
 * description, heading list, and plain-text body. Served as the lazy-loaded
 * `svelte-docsmith/search` virtual module so search can index bodies without
 * bloating the eagerly-imported nav index. The missing-directory case is
 * already reported by {@link collectDocs}, so this stays quiet.
 */
export function collectSearchDocs(
	contentDir: string,
	routesDir: string,
	versions?: DocsVersions
): SearchDoc[] {
	if (!fs.existsSync(contentDir)) return [];

	const docs: SearchDoc[] = [];

	for (const { source, front, url, title, version } of eachTitledPage(
		contentDir,
		routesDir,
		versions
	)) {
		docs.push({
			path: url,
			title,
			section: sectionLabel(front.section),
			description: typeof front.description === 'string' ? front.description : undefined,
			headings: extractToc(source).map((entry) => entry.title),
			text: extractSearchText(source),
			version
		});
	}

	return docs.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Build the LLM records for every page: title, section, description, and the
 * full markdown content. Served as the `svelte-docsmith/llms` virtual module and
 * consumed server-side by `llms.txt` / `llms-full.txt` routes, so it never ships
 * to the client.
 */
export function collectLlmsDocs(
	contentDir: string,
	routesDir: string,
	versions?: DocsVersions
): LlmsDoc[] {
	if (!fs.existsSync(contentDir)) return [];

	const docs: LlmsDoc[] = [];

	for (const { source, front, url, title, version } of eachTitledPage(
		contentDir,
		routesDir,
		versions
	)) {
		docs.push({
			path: url,
			title,
			section: sectionKey(front.section),
			order: typeof front.order === 'number' ? front.order : undefined,
			description: typeof front.description === 'string' ? front.description : undefined,
			content: extractLlmsContent(source, title),
			version
		});
	}

	return docs.sort((a, b) => a.path.localeCompare(b.path));
}
