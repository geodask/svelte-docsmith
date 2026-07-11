/**
 * `svelte-docsmith/vite` — the build-time half of the framework. Node context
 * only. One `docsmith()` call in `vite.config.ts` wires three things:
 *
 *  1. A **content index** served as the virtual module `svelte-docsmith/content`
 *     — your doc pages' frontmatter, scanned at build time, so the sidebar nav
 *     is derived from content and never hand-written. No collection config, no
 *     aliases.
 *  2. A **search index** served as the virtual module `svelte-docsmith/search`
 *     — the same pages reduced to plain-text bodies, in a separate chunk so it
 *     can be lazy-loaded only when search opens.
 *  3. The **`?source` transform** powering `LiveExample`: importing
 *     `Component.svelte?source` yields that file's Shiki-highlighted source.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import GithubSlugger from 'github-slugger';
import yaml from 'js-yaml';
import type { Plugin, ViteDevServer } from 'vite';
import type { DocsContentItem, SearchDoc } from './config.js';
import { DEFAULT_THEMES, lazyHighlighter } from './highlight.js';

export interface DocsmithViteOptions {
	/** Directory scanned for doc pages. Default: `'src/routes/docs'`. */
	content?: string;
	/**
	 * Routes root used to derive each page's URL from its location.
	 * Default: `'src/routes'` (so `src/routes/docs/intro/+page.md` → `/docs/intro`).
	 */
	routes?: string;
	/** Shiki themes for the `?source` render. Default: github-light/github-dark. */
	themes?: { light: string; dark: string };
}

/**
 * The svelte-docsmith Vite plugin. Add it to `plugins` in `vite.config.ts`:
 *
 * ```ts
 * import { docsmith } from 'svelte-docsmith/vite';
 * export default defineConfig({ plugins: [docsmith(), tailwindcss(), sveltekit()] });
 * ```
 */
export function docsmith(options: DocsmithViteOptions = {}): Plugin[] {
	return [contentIndexPlugin(options), exampleSourcePlugin(options)];
}

// --- content index -------------------------------------------------------

const CONTENT_SPECIFIER = 'svelte-docsmith/content';
const VIRTUAL_CONTENT_ID = '\0svelte-docsmith:content';
const SEARCH_SPECIFIER = 'svelte-docsmith/search';
const VIRTUAL_SEARCH_ID = '\0svelte-docsmith:search';
const PAGE_NAMES = ['+page.md', '+page.svx'];

function isPageFile(file: string): boolean {
	return PAGE_NAMES.some((name) => file.endsWith(name));
}

/**
 * List the absolute paths of every `+page.md`/`+page.svx` under `contentDir`.
 */
function listPageFiles(contentDir: string): string[] {
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

type TocEntry = { id: string; title: string; depth: 2 | 3 };

/** Strip inline markdown so a heading's TOC label is plain text. */
function stripInlineMarkdown(text: string): string {
	return text
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[_~]/g, '')
		.trim();
}

/**
 * Reduce a markdown page to plain, searchable body text: prose and heading text
 * with frontmatter, `<script>`/`<style>` blocks, fenced code, HTML/Svelte tags,
 * and markdown punctuation removed. Feeds the generated search index. Code
 * samples are intentionally dropped to keep the index small and prose-focused.
 */
function extractSearchText(source: string): string {
	let body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
	// Component/setup blocks aren't prose; drop them whole before line scanning.
	body = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');

	const out: string[] = [];
	let fence: string | null = null;

	for (const line of body.split('\n')) {
		const f = /^\s*(`{3,}|~{3,})/.exec(line);
		if (f) {
			const ch = f[1][0];
			if (fence === null) fence = ch;
			else if (ch === fence) fence = null;
			continue;
		}
		if (fence !== null) continue;

		// Skip table delimiter rows (`| --- | :--: |`) — pure structure, no words.
		if (/^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line)) continue;

		const text = stripInlineMarkdown(
			line
				.replace(/<[^>]+>/g, ' ') // strip HTML/Svelte tags, keep their text content
				.replace(/^\s{0,3}#{1,6}\s+/, '') // heading markers
				.replace(/^\s{0,3}>\s?/, '') // blockquote markers
				.replace(/^\s*[-*+]\s+/, '') // unordered list bullets
				.replace(/^\s*\d+\.\s+/, '') // ordered list markers
				.replace(/\s*\|\s*/g, ' ') // table cell separators → spaces, not "| a | b |"
		).replace(/\s+/g, ' ');

		if (text) out.push(text);
	}

	return out.join(' ');
}

/**
 * Extract `h2`/`h3` headings from a markdown page so the in-page TOC can be
 * server-rendered (no post-hydration pop-in). Skips fenced code blocks. Ids are
 * produced with the same `github-slugger` that `rehype-slug` uses at render
 * time — including its duplicate-suffixing — so the SSR anchors match the real
 * heading ids exactly, not just for common cases.
 */
function extractToc(source: string): TocEntry[] {
	const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
	const slugger = new GithubSlugger();
	const toc: TocEntry[] = [];
	let fence: string | null = null;

	for (const line of body.split('\n')) {
		const f = /^\s*(`{3,}|~{3,})/.exec(line);
		if (f) {
			const ch = f[1][0];
			if (fence === null) fence = ch;
			else if (ch === fence) fence = null;
			continue;
		}
		if (fence !== null) continue;

		const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
		if (!m) continue;
		const title = stripInlineMarkdown(m[2]);
		if (!title) continue;

		toc.push({ id: slugger.slug(title), title, depth: m[1].length as 2 | 3 });
	}
	return toc;
}

/**
 * Scan `contentDir` for `+page.md`/`+page.svx` files and read the frontmatter
 * fields the sidebar needs (plus the heading list for a server-rendered TOC),
 * deriving each page's URL from its directory relative to `routesDir`. Pure and
 * synchronous so it can be unit-tested.
 */
type PageEntry = {
	source: string;
	front: Record<string, unknown>;
	url: string;
	title: string;
	file: string;
};

/** Last git commit date (strict ISO) for a file, or undefined outside a repo. */
function lastCommitDate(file: string): string | undefined {
	const res = spawnSync('git', ['log', '-1', '--format=%cI', '--', file], {
		cwd: path.dirname(file),
		encoding: 'utf-8'
	});
	const date = res.status === 0 ? res.stdout.trim() : '';
	return date || undefined;
}

/**
 * Walk every nav-worthy page under `contentDir` once: a page is nav-worthy when
 * its frontmatter has a string `title`. Yields the raw source, parsed
 * frontmatter, derived URL, and title so both the nav index and the search
 * index can be built from a single read of each file.
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

function parseFrontmatter(source: string, file: string): Record<string, unknown> {
	const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
	if (!match) return {};
	let data: unknown;
	try {
		data = yaml.load(match[1]);
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		throw new Error(`[svelte-docsmith] invalid YAML frontmatter in ${file}\n${reason}`);
	}
	return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}

function contentIndexPlugin(options: DocsmithViteOptions): Plugin {
	const contentDir = path.resolve(options.content ?? 'src/routes/docs');
	const routesDir = path.resolve(options.routes ?? 'src/routes');

	return {
		name: 'docsmith-content',
		enforce: 'pre',

		resolveId(id) {
			if (id === CONTENT_SPECIFIER) return VIRTUAL_CONTENT_ID;
			if (id === SEARCH_SPECIFIER) return VIRTUAL_SEARCH_ID;
		},

		load(id) {
			// Watch each page file (not the directory) so editing frontmatter or
			// body re-runs this load. A directory here is treated as an
			// unresolvable import by vite:import-analysis; new/removed pages are
			// handled by the watcher in configureServer.
			if (id === VIRTUAL_CONTENT_ID) {
				for (const file of listPageFiles(contentDir)) this.addWatchFile(file);
				const docs = collectDocs(contentDir, routesDir);
				return `export const docs = ${JSON.stringify(docs, null, 2)};\n`;
			}
			if (id === VIRTUAL_SEARCH_ID) {
				for (const file of listPageFiles(contentDir)) this.addWatchFile(file);
				const docs = collectSearchDocs(contentDir, routesDir);
				return `export const docs = ${JSON.stringify(docs)};\n`;
			}
		},

		configureServer(server: ViteDevServer) {
			server.watcher.add(contentDir);
			const onChange = (file: string) => {
				if (!isPageFile(file)) return;
				let invalidated = false;
				for (const virtualId of [VIRTUAL_CONTENT_ID, VIRTUAL_SEARCH_ID]) {
					const mod = server.moduleGraph.getModuleById(virtualId);
					if (!mod) continue;
					server.moduleGraph.invalidateModule(mod);
					invalidated = true;
				}
				if (invalidated) server.ws.send({ type: 'full-reload' });
			};
			server.watcher.on('add', onChange);
			server.watcher.on('unlink', onChange);
			server.watcher.on('change', onChange);
		}
	};
}

// --- ?source transform (LiveExample) ------------------------------------

const SOURCE_PREFIX = '\0docsmith-source:';
// The virtual id must NOT end in `.svelte`, or vite-plugin-svelte will try to
// compile the highlighted-HTML string as a component.
const SOURCE_EXT = '.docsmith-src';
const SOURCE_SUFFIX = '?source';

function exampleSourcePlugin(options: DocsmithViteOptions): Plugin {
	const themes = options.themes ?? DEFAULT_THEMES;
	const getHighlighter = lazyHighlighter([themes.light, themes.dark], ['svelte']);

	return {
		name: 'docsmith-example-source',
		enforce: 'pre',

		async resolveId(id, importer) {
			if (!id.endsWith('.svelte' + SOURCE_SUFFIX)) return;
			const base = id.slice(0, -SOURCE_SUFFIX.length);
			const resolved = await this.resolve(base, importer, { skipSelf: true });
			if (resolved) return SOURCE_PREFIX + resolved.id + SOURCE_EXT;
		},

		async load(id) {
			if (!id.startsWith(SOURCE_PREFIX)) return;
			const file = id.slice(SOURCE_PREFIX.length, -SOURCE_EXT.length);
			this.addWatchFile(file);

			const code = fs.readFileSync(file, 'utf-8').trimEnd();
			const highlighter = await getHighlighter();
			// Strip Shiki's own surface (the inline light `background-color` and the
			// `--shiki-dark-bg` var) so the highlighted source sits on the
			// consuming component's token background — matching markdown code blocks,
			// and never flashing Shiki's default before component CSS applies.
			const html = highlighter
				.codeToHtml(code, { lang: 'svelte', themes })
				.replace(/background-color:[^;"]*;?/gi, '')
				.replace(/--shiki-dark-bg:[^;"]*;?/gi, '');
			return `export default ${JSON.stringify(html)};`;
		}
	};
}
