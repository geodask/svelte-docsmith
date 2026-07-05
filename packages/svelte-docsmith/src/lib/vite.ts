/**
 * `svelte-docsmith/vite` — the build-time half of the framework. Node context
 * only. One `docsmith()` call in `vite.config.ts` wires two things:
 *
 *  1. A **content index** served as the virtual module `svelte-docsmith/content`
 *     — your doc pages' frontmatter, scanned at build time, so the sidebar nav
 *     is derived from content and never hand-written. No velite, no collection
 *     config, no aliases.
 *  2. The **`?source` transform** powering `LiveExample`: importing
 *     `Component.svelte?source` yields that file's Shiki-highlighted source.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { Plugin, ViteDevServer } from 'vite';
import type { DocsContentItem } from './config.js';
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

/** Slugify heading text the way rehype-slug (github-slugger) does for common
 *  cases: lowercase, drop punctuation/symbols, spaces → hyphens. */
function slugify(text: string): string {
	return text
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.replace(/\s+/g, '-');
}

/** Strip inline markdown so a heading's TOC label is plain text. */
function stripInlineMarkdown(text: string): string {
	return text
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[_~]/g, '')
		.trim();
}

/**
 * Extract `h2`/`h3` headings from a markdown page so the in-page TOC can be
 * server-rendered (no post-hydration pop-in). Skips fenced code blocks; ids
 * match rehype-slug for typical headings, and the runtime engine's DOM re-scan
 * corrects any edge cases after hydration.
 */
function extractToc(source: string): TocEntry[] {
	const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
	const seen = new Map<string, number>();
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

		const base = slugify(title);
		const n = seen.get(base) ?? 0;
		seen.set(base, n + 1);
		toc.push({ id: n > 0 ? `${base}-${n}` : base, title, depth: m[1].length as 2 | 3 });
	}
	return toc;
}

/**
 * Scan `contentDir` for `+page.md`/`+page.svx` files and read the frontmatter
 * fields the sidebar needs (plus the heading list for a server-rendered TOC),
 * deriving each page's URL from its directory relative to `routesDir`. Pure and
 * synchronous so it can be unit-tested.
 */
export function collectDocs(contentDir: string, routesDir: string): DocsContentItem[] {
	const items: DocsContentItem[] = [];

	for (const file of listPageFiles(contentDir)) {
		const source = fs.readFileSync(file, 'utf-8');
		const front = parseFrontmatter(source);
		if (typeof front.title !== 'string') continue; // a page without a title isn't nav-worthy

		const dir = path.dirname(file);
		const url = '/' + path.relative(routesDir, dir).split(path.sep).join('/');
		items.push({
			title: front.title,
			path: url,
			description: typeof front.description === 'string' ? front.description : undefined,
			section: typeof front.section === 'string' ? front.section : undefined,
			order: typeof front.order === 'number' ? front.order : undefined,
			toc: extractToc(source)
		});
	}

	// Stable output keeps the generated module diff-friendly across rebuilds.
	return items.sort((a, b) => a.path.localeCompare(b.path));
}

function parseFrontmatter(source: string): Record<string, unknown> {
	const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
	if (!match) return {};
	const data = yaml.load(match[1]);
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
		},

		load(id) {
			if (id !== VIRTUAL_CONTENT_ID) return;
			// Watch each page file (not the directory) so editing frontmatter
			// re-runs this load. A directory here is treated as an unresolvable
			// import by vite:import-analysis; new/removed pages are handled by
			// the watcher in configureServer.
			for (const file of listPageFiles(contentDir)) this.addWatchFile(file);
			const docs = collectDocs(contentDir, routesDir);
			return `export const docs = ${JSON.stringify(docs, null, 2)};\n`;
		},

		configureServer(server: ViteDevServer) {
			server.watcher.add(contentDir);
			const onChange = (file: string) => {
				if (!isPageFile(file)) return;
				const mod = server.moduleGraph.getModuleById(VIRTUAL_CONTENT_ID);
				if (!mod) return;
				server.moduleGraph.invalidateModule(mod);
				server.ws.send({ type: 'full-reload' });
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
