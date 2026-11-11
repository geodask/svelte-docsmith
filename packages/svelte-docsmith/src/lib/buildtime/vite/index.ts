/**
 * `svelte-docsmith/vite` — the build-time half of the framework, and the one
 * place a site is configured. Node context only. One `docsmith()` call in
 * `vite.config.ts` wires:
 *
 *  1. The **site config** served as the virtual module `svelte-docsmith/site`,
 *     which `DocsShell`, `ErrorPage` and the route handlers read themselves,
 *     with the outside paths its links are marked `rel="external"` under.
 *  2. The **markdown compiler**, run on every doc page before
 *     vite-plugin-svelte sees it (see `./markdown.js`).
 *  3. A **content index** served as the virtual module `svelte-docsmith/content`
 *     — your doc pages' frontmatter, scanned at build time, so the sidebar nav
 *     is derived from content and never hand-written. No collection config, no
 *     aliases.
 *  4. A **search index** served as the virtual module `svelte-docsmith/search`
 *     — the same pages reduced to plain-text bodies, in a separate chunk so it
 *     can be lazy-loaded only when search opens. (An `svelte-docsmith/llms`
 *     index of full markdown bodies is wired the same way.)
 *  5. The **theme**, appended to the stylesheet `svelte-docsmith/theme.css`
 *     compiles into (see `./theme.js`).
 *  6. The author's **reader event handler** served as the virtual module
 *     `svelte-docsmith/reader-events`, which the shell, error page and search
 *     report reader events to (`undefined` when `readerEvents` names none).
 *  7. The **doc imports** a page makes for its examples and props tables:
 *     `Component.svelte?source` yields that file's highlighted source for
 *     `LiveExample`, and `Component.svelte?props` its extracted props for
 *     `<PropsTable of={…}>`. Each kind lives in `./doc-imports/`, with the page
 *     side served here and the agent side written into the llms index.
 *
 * The options themselves are resolved in `./options.js`. What each generated
 * module exports is described in `./generated-modules.js`, the one home of
 * the six. Reading the docs root lives in `./pages.js` and building each index
 * from what it read lives in `./collect.js`; props are read through
 * `../props/reader.js`, which owns the shared extractor, file watching and
 * warn-once. Broken-link reporting lives in `./broken-links.js`. This file
 * owns the Vite plugins, as adapters over those.
 */
import type { Plugin, ViteDevServer } from 'vite';
import { isPageFile } from './pages.js';
import { docImportDeps, docImportsPlugin, type DocImportDeps } from './doc-imports/index.js';
import { generatedModules } from './generated-modules.js';
import { markdownPlugin } from './markdown.js';
import { markdownExtensions } from '../markdown.js';
import { resolveOptions, type DocsmithOptions, type ResolvedDocsmithOptions } from './options.js';
import { brokenLinksReporter } from './broken-links.js';
import { themePlugin } from './theme.js';

export type {
	DocsmithOptions,
	DocsmithChangelogOptions,
	DocsmithLinksOptions,
	BrokenLinksLevel
} from './options.js';
export type { DocsmithMarkdownOptions } from '../markdown.js';
export type { DocsmithSite } from '../../core/config.js';

/**
 * The svelte-docsmith Vite plugin, and the one place a site is configured. Add
 * it to `plugins` in `vite.config.ts`, before `sveltekit()`:
 *
 * ```ts
 * import { docsmith } from 'svelte-docsmith/vite';
 * export default defineConfig({
 *   plugins: [docsmith({ site: { title: 'My Docs' } }), tailwindcss(), sveltekit()]
 * });
 * ```
 */
export function docsmith(options: DocsmithOptions): Plugin[] {
	const resolved = resolveOptions(options);
	for (const notice of resolved.deprecations) console.warn(notice);
	const docImports = docImportDeps(resolved);
	return [
		contentIndexPlugin(resolved, docImports, options),
		markdownPlugin(
			resolved.markdown,
			docImports.render,
			resolved.links.outside,
			resolved.routesDir
		),
		docImportsPlugin(docImports),
		themePlugin(resolved.themeFile)
	];
}

// --- generated modules ----------------------------------------------------

/**
 * The plugin that serves the generated modules. An adapter and nothing more:
 * what each module exports is described in `./generated-modules.js`, and this
 * maps Vite's hooks onto that set.
 */
function contentIndexPlugin(
	options: ResolvedDocsmithOptions,
	docImports: DocImportDeps,
	authored: DocsmithOptions
): Plugin {
	const { contentDir, routesDir, versions, links } = options;
	const brokenLinks = brokenLinksReporter({
		indexOptions: { contentDir, routesDir, versions, math: options.markdown?.math },
		links,
		markdownExtensions: markdownExtensions(options.markdown)
	});
	const generated = generatedModules(options, docImports, {
		pagesRead: (pages) => brokenLinks.pagesRead(pages)
	});

	return {
		name: 'docsmith-content',
		enforce: 'pre',
		// Read by the archive CLI, which loads `vite.config` to find these
		// rather than asking for the same directories and versions again. As
		// written, so the CLI resolves the paths against its own directory.
		api: { docsmith: authored },

		configResolved(config) {
			brokenLinks.configResolved(config.command);
		},

		resolveId(id) {
			return generated.resolve(id);
		},

		load(id) {
			return generated.load(id, {
				watch: (file) => this.addWatchFile(file),
				resolve: async (specifier, importer) =>
					(await this.resolve(specifier, importer, { skipSelf: true }))?.id,
				warn: (message) => this.warn(message)
			});
		},

		configureServer(server: ViteDevServer) {
			server.watcher.add(contentDir);
			brokenLinks.devStarted();
			const onChange = (file: string) => {
				brokenLinks.fileChanged(file);
				if (!isPageFile(file)) return;
				let invalidated = false;
				for (const id of generated.builtFromPages) {
					const mod = server.moduleGraph.getModuleById(id);
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
