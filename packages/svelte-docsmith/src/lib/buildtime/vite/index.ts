/**
 * `svelte-docsmith/vite` — the build-time half of the framework, and the one
 * place a site is configured. Node context only. One `docsmith()` call in
 * `vite.config.ts` wires:
 *
 *  1. The **site config** served as the virtual module `svelte-docsmith/site`,
 *     which `DocsShell`, `ErrorPage` and the route handlers read themselves.
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
 *  5. The **`?source` transform** powering `LiveExample`: importing
 *     `Component.svelte?source` yields that file's highlighted source, drawn by
 *     the same code block renderer as a markdown fence.
 *  6. The **`?props` transform** powering generated props tables: importing
 *     `Component.svelte?props` yields that component's extracted props, for
 *     `<PropsTable of={…}>` (see `../props/extract.js`).
 *
 * The options themselves are resolved in `./options.js`. Reading the docs root
 * lives in `./pages.js` and building each index from what it read lives in
 * `./collect.js`. The `?source` and `?props` transforms share one plugin shape
 * (`./doc-import.js`), and props are read through `../props/reader.js`, which
 * owns the shared extractor, file watching and warn-once. This file owns the
 * Vite plugins and is the only layer that reports to the console.
 */
import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { codeBlockRenderer, sourcePanelHtml, type RenderCodeBlock } from '../code-block.js';
import { checkVersions, resolveVersions } from '../../core/version.js';
import { ARCHIVE_MARKER, discoverArchives } from '../archives.js';
import { docsBaseFrom } from '../paths.js';
import { isPageFile, readSourcePages, withCommitDates, type SourcePage } from './pages.js';
import { contentIndex, searchIndex } from './collect.js';
import { llmsIndex } from './agent-markdown.js';
import { collectReleases } from './releases.js';
import { commitDates } from '../git.js';
import { createPropsReader, type PropsReader } from '../props/reader.js';
import { docImportPlugin } from './doc-import.js';
import { readExampleSource } from './example-source.js';
import { checkFrontmatter } from './frontmatter-schema.js';
import { markdownPlugin } from './markdown.js';
import { resolveOptions, type DocsmithOptions, type ResolvedDocsmithOptions } from './options.js';

export type { DocsmithOptions, DocsmithChangelogOptions } from './options.js';
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
	// One props reader for the `?props` transform and the llms index, so both
	// read components against one TypeScript program.
	const props = createPropsReader({ tsconfig: resolved.tsconfig });
	// One renderer for markdown fences and `?source` panels: one set of themes,
	// one Shiki highlighter.
	const renderCodeBlock = codeBlockRenderer({
		themes: resolved.themes,
		langs: resolved.markdown.langs,
		lineNumbers: resolved.markdown.lineNumbers,
		twoslash: resolved.markdown.twoslash
	});
	return [
		contentIndexPlugin(resolved, props, options),
		markdownPlugin(resolved.markdown, renderCodeBlock),
		exampleSourcePlugin(renderCodeBlock),
		propsPlugin(props)
	];
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
const SITE_SPECIFIER = 'svelte-docsmith/site';
const VIRTUAL_SITE_ID = '\0svelte-docsmith:site';

/**
 * Tell the author when their docs root produced nothing, and why. An empty
 * sidebar is otherwise silent: the build succeeds and the site renders, so
 * without this the first sign of a misconfigured `content` is a missing nav.
 */
function warnAboutDocsRoot(contentDir: string, exists: boolean, indexed: number) {
	if (!exists) {
		console.warn(
			`[svelte-docsmith] content directory not found: ${contentDir}\n` +
				`  The sidebar will be empty. Create your doc pages there, or point docsmith() at the right place with \`content\`.`
		);
	} else if (indexed === 0) {
		console.warn(
			`[svelte-docsmith] no doc pages found under ${contentDir}\n` +
				`  Add \`+page.md\` files with at least a \`title:\` in their frontmatter to populate the sidebar.`
		);
	}
}

function contentIndexPlugin(
	options: ResolvedDocsmithOptions,
	props: PropsReader,
	authored: DocsmithOptions
): Plugin {
	const { contentDir, routesDir, versions, changelogFile } = options;
	const docsBase = docsBaseFrom(routesDir, contentDir);
	const changelogRoute = options.changelogPath;
	const changelogOverrides = path.join(routesDir, changelogRoute);
	const indexOptions = { contentDir, routesDir, versions };

	// One history walk, reused for the life of the plugin. A build loads this
	// module once, so it is always fresh there; `dev` reloads it on every page
	// save, and re-walking each time would cost git a process for dates that
	// cannot have changed without a commit. The trade is that committing during
	// `dev` leaves the dates as they were until the server restarts.
	let dates: Map<string, string> | undefined;
	const trackedDates = () =>
		(dates ??= commitDates(contentDir, (reason) => {
			// Truncation and shallow clones both refuse dates deliberately; the
			// reason line says which. "Could not read" would misframe a shallow
			// skip as a hard failure.
			console.warn(
				`[svelte-docsmith] skipping git-derived page dates under ${contentDir}\n` +
					`  ${reason}\n` +
					`  Pages will render without a last-updated date, and sitemap entries without \`lastmod\`.`
			);
		}));

	return {
		name: 'docsmith-content',
		enforce: 'pre',
		// Read by the archive CLI, which loads `vite.config` to find these
		// rather than asking for the same directories and versions again. As
		// written, so the CLI resolves the paths against its own directory.
		api: { docsmith: authored },

		resolveId(id) {
			if (id === CONTENT_SPECIFIER) return VIRTUAL_CONTENT_ID;
			if (id === SEARCH_SPECIFIER) return VIRTUAL_SEARCH_ID;
			if (id === LLMS_SPECIFIER) return VIRTUAL_LLMS_ID;
			if (id === CHANGELOG_SPECIFIER) return VIRTUAL_CHANGELOG_ID;
			if (id === SITE_SPECIFIER) return VIRTUAL_SITE_ID;
		},

		async load(id) {
			// Watch each page file (not the directory) so editing frontmatter or
			// body re-runs this load. A directory here is treated as an
			// unresolvable import by vite:import-analysis; new/removed pages are
			// handled by the watcher in configureServer.
			const watch = (pages: SourcePage[]) => {
				for (const page of pages) this.addWatchFile(page.file);
			};

			if (id === VIRTUAL_SITE_ID) {
				// Checked as plain data when the options were resolved, so JSON is
				// the whole of it.
				return `export const site = ${JSON.stringify(options.site, null, 2)};\n`;
			}
			if (id === VIRTUAL_CONTENT_ID) {
				// Before anything is read: a config that disagrees with the docs root
				// produces an index that is wrong rather than empty, so it has to fail
				// here rather than render. Re-runs on invalidation, so archiving during
				// `dev` reports immediately.
				checkVersions(versions, discoverArchives(contentDir), ARCHIVE_MARKER);
				const { pages, exists } = readSourcePages(contentDir);
				watch(pages);
				// Checked here only: the docs layout always imports this index, so a
				// bad page fails the build (or raises the dev overlay) once, not once
				// per index.
				const typos = await checkFrontmatter(pages, options.schema);
				if (typos) console.warn(typos);
				// Only this index has a date field, so only this one pays for git.
				const docs = contentIndex(withCommitDates(pages, trackedDates()), indexOptions);
				warnAboutDocsRoot(contentDir, exists, docs.length);
				const resolved = resolveVersions(versions, docsBase, docs);
				return (
					`export const docs = ${JSON.stringify(docs, null, 2)};\n` +
					`export const versions = ${JSON.stringify(resolved, null, 2)};\n` +
					`export const content = { docs, versions };\n`
				);
			}
			if (id === VIRTUAL_SEARCH_ID) {
				const { pages } = readSourcePages(contentDir);
				watch(pages);
				return `export const docs = ${JSON.stringify(searchIndex(pages, indexOptions))};\n`;
			}
			if (id === VIRTUAL_LLMS_ID) {
				const { pages } = readSourcePages(contentDir);
				watch(pages);
				// What agents read: each page as agent markdown. Its imports resolve
				// the way Vite resolves the page's own, and props come from the shared
				// extractor, so pages without a props import never load TypeScript.
				const docs = await llmsIndex(pages, indexOptions, {
					resolve: async (specifier, importer) =>
						(await this.resolve(specifier, importer, { skipSelf: true }))?.id,
					watch: (file) => this.addWatchFile(file),
					warn: (message) => this.warn(message),
					source: readExampleSource,
					props: async (file) => (await props.read(file, this)).markdown
				});
				return `export const docs = ${JSON.stringify(docs)};\n`;
			}
			if (id === VIRTUAL_CHANGELOG_ID) {
				// The route goes out with the releases so the feed links to the page
				// the plugin dated them against, not to a second default.
				const route = `export const changelogPath = ${JSON.stringify(changelogRoute)};\n`;
				if (!changelogFile) return `export const releases = [];\n` + route;
				this.addWatchFile(changelogFile);
				const releases = collectReleases(changelogFile, changelogOverrides, changelogRoute);
				return `export const releases = ${JSON.stringify(releases)};\n` + route;
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

// --- ?source and ?props transforms -------------------------------------

function exampleSourcePlugin(renderCodeBlock: RenderCodeBlock): Plugin {
	return docImportPlugin('docsmith-example-source', 'source', async (file, hook) => {
		hook.addWatchFile(file);
		const code = readExampleSource(file);
		if (code === undefined) throw new Error(`[svelte-docsmith] could not read ${file}`);
		// The same renderer as a markdown fence, so the panel matches one.
		const html = sourcePanelHtml(await renderCodeBlock(code, 'svelte'));
		return `export default ${JSON.stringify(html)};`;
	});
}

function propsPlugin(reader: PropsReader): Plugin {
	return {
		...docImportPlugin('docsmith-props', 'props', async (file, hook) => {
			const { props } = await reader.read(file, hook);
			return `export default ${JSON.stringify(props)};`;
		}),
		// The one place the reader learns the root: `docsmith()` returns this
		// plugin with the content plugin, whose llms index reads through the
		// same reader, and every `configResolved` runs before any `load`.
		configResolved(config) {
			reader.configure(config.root);
		}
	};
}
