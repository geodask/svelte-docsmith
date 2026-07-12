import fs from 'node:fs';
import path from 'node:path';
import type { DocsContentItem, LlmsDoc, SearchDoc } from '$lib/core/content.js';
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
};

/**
 * Walk every nav-worthy page under `contentDir` once: a page is nav-worthy when
 * its frontmatter has a string `title`. Yields the raw source, parsed
 * frontmatter, derived URL, and title so every index (nav, search, llms) can be
 * built from a single read of each file.
 */
function* eachTitledPage(contentDir: string, routesDir: string): Generator<PageEntry> {
	for (const file of listPageFiles(contentDir)) {
		const source = fs.readFileSync(file, 'utf-8');
		const front = parseFrontmatter(source, file);
		if (typeof front.title !== 'string') continue;

		const dir = path.dirname(file);
		const url = '/' + path.relative(routesDir, dir).split(path.sep).join('/');
		yield { source, front, url, title: front.title, file };
	}
}

/**
 * Scan `contentDir` for `+page.md`/`+page.svx` files and read the frontmatter
 * fields the sidebar needs (plus the heading list for a server-rendered TOC and
 * an estimated reading time), deriving each page's URL from its directory
 * relative to `routesDir`. Pure and synchronous so it can be unit-tested.
 */
export function collectDocs(contentDir: string, routesDir: string): DocsContentItem[] {
	if (!fs.existsSync(contentDir)) {
		console.warn(
			`[svelte-docsmith] content directory not found: ${contentDir}\n` +
				`  The sidebar will be empty. Create your doc pages there, or point docsmith() at the right place with \`content\`.`
		);
		return [];
	}

	const items: DocsContentItem[] = [];

	for (const { source, front, url, title, file } of eachTitledPage(contentDir, routesDir)) {
		items.push({
			title,
			path: url,
			description: typeof front.description === 'string' ? front.description : undefined,
			section: typeof front.section === 'string' ? front.section : undefined,
			order: typeof front.order === 'number' ? front.order : undefined,
			sourcePath: path.relative(process.cwd(), file).split(path.sep).join('/'),
			lastUpdated: lastCommitDate(file),
			readingTime: readingMinutes(extractSearchText(source)),
			toc: extractToc(source)
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
export function collectSearchDocs(contentDir: string, routesDir: string): SearchDoc[] {
	if (!fs.existsSync(contentDir)) return [];

	const docs: SearchDoc[] = [];

	for (const { source, front, url, title } of eachTitledPage(contentDir, routesDir)) {
		docs.push({
			path: url,
			title,
			section: typeof front.section === 'string' ? front.section : undefined,
			description: typeof front.description === 'string' ? front.description : undefined,
			headings: extractToc(source).map((entry) => entry.title),
			text: extractSearchText(source)
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
export function collectLlmsDocs(contentDir: string, routesDir: string): LlmsDoc[] {
	if (!fs.existsSync(contentDir)) return [];

	const docs: LlmsDoc[] = [];

	for (const { source, front, url, title } of eachTitledPage(contentDir, routesDir)) {
		docs.push({
			path: url,
			title,
			section: typeof front.section === 'string' ? front.section : undefined,
			order: typeof front.order === 'number' ? front.order : undefined,
			description: typeof front.description === 'string' ? front.description : undefined,
			content: extractLlmsContent(source, title)
		});
	}

	return docs.sort((a, b) => a.path.localeCompare(b.path));
}
