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
 *     can be lazy-loaded only when search opens. (An `svelte-docsmith/llms`
 *     index of full markdown bodies is wired the same way.)
 *  3. The **`?source` transform** powering `LiveExample`: importing
 *     `Component.svelte?source` yields that file's Shiki-highlighted source.
 *
 * The per-index scanning lives in `./collect.js`; this file owns the two Vite
 * plugins and re-exports the collectors for consumers and tests.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { DEFAULT_THEMES, lazyHighlighter } from '../highlight.js';
import { isPageFile, listPageFiles } from './pages.js';
import { collectDocs, collectLlmsDocs, collectSearchDocs } from './collect.js';
import { collectReleases } from './releases.js';

export { collectDocs, collectLlmsDocs, collectSearchDocs } from './collect.js';
export { collectReleases } from './releases.js';

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
	/**
	 * Path to the `CHANGELOG.md` that feeds the generated
	 * `svelte-docsmith/changelog` index. Default: `'CHANGELOG.md'` in the app
	 * directory; point it at the package whose releases you publish. Set `false`
	 * to skip the changelog entirely.
	 */
	changelog?: string | false;
	/**
	 * Route the changelog is served at, used to build feed links and to find
	 * hand-written per-release pages. Default: `'/changelog'`.
	 */
	changelogPath?: string;
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

// --- content / search / llms index --------------------------------------

const CONTENT_SPECIFIER = 'svelte-docsmith/content';
const VIRTUAL_CONTENT_ID = '\0svelte-docsmith:content';
const SEARCH_SPECIFIER = 'svelte-docsmith/search';
const VIRTUAL_SEARCH_ID = '\0svelte-docsmith:search';
const LLMS_SPECIFIER = 'svelte-docsmith/llms';
const VIRTUAL_LLMS_ID = '\0svelte-docsmith:llms';
const CHANGELOG_SPECIFIER = 'svelte-docsmith/changelog';
const VIRTUAL_CHANGELOG_ID = '\0svelte-docsmith:changelog';

function contentIndexPlugin(options: DocsmithViteOptions): Plugin {
	const contentDir = path.resolve(options.content ?? 'src/routes/docs');
	const routesDir = path.resolve(options.routes ?? 'src/routes');
	const changelogFile =
		options.changelog === false ? undefined : path.resolve(options.changelog ?? 'CHANGELOG.md');
	const changelogRoute = options.changelogPath ?? '/changelog';
	const changelogOverrides = path.join(routesDir, changelogRoute.replace(/^\//, ''));

	return {
		name: 'docsmith-content',
		enforce: 'pre',

		resolveId(id) {
			if (id === CONTENT_SPECIFIER) return VIRTUAL_CONTENT_ID;
			if (id === SEARCH_SPECIFIER) return VIRTUAL_SEARCH_ID;
			if (id === LLMS_SPECIFIER) return VIRTUAL_LLMS_ID;
			if (id === CHANGELOG_SPECIFIER) return VIRTUAL_CHANGELOG_ID;
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
			if (id === VIRTUAL_LLMS_ID) {
				for (const file of listPageFiles(contentDir)) this.addWatchFile(file);
				const docs = collectLlmsDocs(contentDir, routesDir);
				return `export const docs = ${JSON.stringify(docs)};\n`;
			}
			if (id === VIRTUAL_CHANGELOG_ID) {
				if (!changelogFile) return `export const releases = [];\n`;
				this.addWatchFile(changelogFile);
				const releases = collectReleases(changelogFile, changelogOverrides, changelogRoute);
				return `export const releases = ${JSON.stringify(releases)};\n`;
			}
		},

		configureServer(server: ViteDevServer) {
			server.watcher.add(contentDir);
			const onChange = (file: string) => {
				if (!isPageFile(file)) return;
				let invalidated = false;
				for (const virtualId of [VIRTUAL_CONTENT_ID, VIRTUAL_SEARCH_ID, VIRTUAL_LLMS_ID]) {
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
