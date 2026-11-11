/**
 * The generated modules: what the `docsmith()` plugin serves in place of
 * `svelte-docsmith/site`, `/content`, `/search`, `/llms`, `/changelog` and
 * `/reader-events`. Each is described once, below, as the data it exports:
 *
 *  - Its **exports** are typed by its fallback in `../../fallbacks/`, the file
 *    the specifier resolves to when the plugin is missing. So the fallback is
 *    the one declaration of a module's export names and types: add an export
 *    there and the description below stops compiling until it supplies it.
 *  - {@link GeneratedModuleSet.read} returns those exports as data, which is
 *    what tests assert on.
 *  - {@link GeneratedModuleSet.load} writes them out as the JavaScript Vite
 *    serves. Nothing else writes a generated module.
 *
 * The Vite plugin in `./index.ts` is an adapter over this: it maps
 * `resolveId`, `load` and the dev watcher onto the set, and adds nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { checkVersions, resolveVersions } from '../../core/version.js';
import { ogColours } from '../../server/og/colours.js';
import { ARCHIVE_MARKER, discoverArchives } from '../archives.js';
import { parseChangelog } from '../changelog.js';
import { commitDates } from '../git.js';
import { siteGithubStars } from '../github-stars.js';
import { checkOutsidePaths } from '../outside-paths.js';
import { docsBaseFrom } from '../paths.js';
import { llmsIndex, type ResolveImport } from './agent-markdown.js';
import { contentIndex, searchIndex } from './collect.js';
import { docImportReads, type DocImportDeps } from './doc-imports/index.js';
import { checkFrontmatter } from './frontmatter-schema.js';
import type { ResolvedDocsmithOptions } from './options.js';
import { readSourcePages, withCommitDates, type SourcePage } from './pages.js';
import { collectReleases } from './releases.js';
import { themeTokens } from './theme.js';

/** Every generated module, by the name after `svelte-docsmith/`. */
export const GENERATED_MODULE_NAMES = [
	'site',
	'reader-events',
	'content',
	'search',
	'llms',
	'changelog'
] as const;

export type GeneratedModuleName = (typeof GENERATED_MODULE_NAMES)[number];

/** A generated module's exports, as its fallback declares them. */
type Declared = {
	site: typeof import('../../fallbacks/site.js');
	'reader-events': typeof import('../../fallbacks/reader-events.js');
	content: typeof import('../../fallbacks/content.js');
	search: typeof import('../../fallbacks/search.js');
	llms: typeof import('../../fallbacks/llms.js');
	changelog: typeof import('../../fallbacks/changelog.js');
};

/**
 * An export that is another module's default export rather than data: the
 * author's reader event handler, imported by its real path so editing it is an
 * ordinary hot update.
 */
export class DefaultExportOf {
	constructor(readonly file: string) {}
}

/** A function can't be written as JSON: it is always another module's default export. */
type AsData<T> = T extends (...args: never[]) => unknown ? DefaultExportOf : T;

/**
 * A generated module's exports as data. The reader event handler is the one
 * export that isn't data, so it reads as the file it comes from.
 */
export type GeneratedModuleExports<K extends GeneratedModuleName = GeneratedModuleName> = {
	[E in keyof Declared[K]]: AsData<Declared[K][E]>;
};

/** What a generated module asks of whoever loads it: Rollup's plugin context has all three. */
export type GeneratedModuleHost = {
	/** Record a file the module was read from, so editing it loads the module again. */
	watch(file: string): void;
	/** Resolve an import the way Vite resolves a page's own. */
	resolve: ResolveImport;
	warn(message: string): void;
};

/** The hooks the content index calls with the pages it read. */
export type GeneratedModuleHooks = {
	/** Once per load of the content index, with every page under the docs root. */
	pagesRead(pages: SourcePage[]): void;
};

export type GeneratedModuleSet = {
	/** The id Vite loads for `specifier`, when it names a generated module. */
	resolve(specifier: string): string | undefined;
	/** One module's exports, as data. */
	read<K extends GeneratedModuleName>(
		name: K,
		host: GeneratedModuleHost
	): Promise<GeneratedModuleExports<K>>;
	/** The JavaScript Vite serves for `id`, or `undefined` when it is no generated module. */
	load(id: string, host: GeneratedModuleHost): Promise<string | undefined>;
	/**
	 * The ids of the modules built from the doc pages. A page added or removed
	 * in `dev` changes them without touching a file they watch, so the dev
	 * server has to load them again itself.
	 */
	builtFromPages: string[];
};

const specifierOf = (name: GeneratedModuleName) => `svelte-docsmith/${name}`;
/** `\0` keeps other plugins, and the file system, away from the id. */
const idOf = (name: GeneratedModuleName) => `\0svelte-docsmith:${name}`;

type Description<K extends GeneratedModuleName> = {
	/** Whether the module is built from the doc pages (see `builtFromPages`). */
	fromPages?: true;
	exports(
		host: GeneratedModuleHost
	): Promise<GeneratedModuleExports<K>> | GeneratedModuleExports<K>;
};

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

/** The generated modules of one `docsmith()` call. */
export function generatedModules(
	options: ResolvedDocsmithOptions,
	docImports: DocImportDeps,
	hooks: GeneratedModuleHooks
): GeneratedModuleSet {
	const { contentDir, routesDir, versions, changelogFile, links } = options;
	const docsBase = docsBaseFrom(routesDir, contentDir);
	const changelogRoute = options.changelogPath;
	const changelogOverrides = path.join(routesDir, changelogRoute);
	const indexOptions = { contentDir, routesDir, versions, math: options.markdown?.math };

	// One history walk, reused for the life of the plugin. A build loads the
	// content index once, so it is always fresh there; `dev` reloads it on
	// every page save, and re-walking each time would cost git a process for
	// dates that cannot have changed without a commit. The trade is that
	// committing during `dev` leaves the dates as they were until the server
	// restarts.
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

	// One star-count fetch for the life of the plugin. SvelteKit builds its
	// server and client with shared plugins, so both halves get one count;
	// a `dev` restart loads `vite.config` again, so it makes a new plugin and
	// fetches afresh, failures included.
	let stars: Promise<number | undefined> | undefined;
	const trackedStars = () =>
		(stars ??= siteGithubStars(options.site, (reason) => {
			console.warn(
				`[svelte-docsmith] could not fetch the GitHub star count for ${options.site.github} at build time\n` +
					`  ${reason}\n` +
					`  Readers' browsers will fetch the count instead. Set GITHUB_TOKEN to bake it in, or \`site.githubStars: false\` to turn it off.`
			);
		}));

	// Each page file is watched (not the directory) so editing frontmatter or
	// body loads the module again. A directory would be treated as an
	// unresolvable import by vite:import-analysis; pages added and removed are
	// what `builtFromPages` is for.
	const readPages = (host: GeneratedModuleHost) => {
		const read = readSourcePages(contentDir);
		for (const page of read.pages) host.watch(page.file);
		return read;
	};

	const modules: { [K in GeneratedModuleName]: Description<K> } = {
		site: {
			exports: async () => ({
				// Checked as plain data when the options were resolved, so JSON is
				// the whole of the site.
				site: options.site,
				// Resolved, so the shell's site config links match them exactly as
				// the compiler does.
				outside: links.outside,
				// A number, or `undefined` when there is no count to show.
				githubStars: await trackedStars(),
				// Read from the theme file so a card matches the site's theme. Server
				// code alone reads them, so they tree-shake out of the browser's bundle.
				ogColours: ogColours(themeTokens(fs.readFileSync(options.themeFile, 'utf8')))
			})
		},

		'reader-events': {
			// A module without a default export fails the import, which is the
			// error the author needs.
			exports: () => ({
				handler: options.readerEventsFile
					? new DefaultExportOf(options.readerEventsFile)
					: undefined
			})
		},

		content: {
			fromPages: true,
			exports: async (host) => {
				// Before anything is read: a config that disagrees with the docs root
				// produces an index that is wrong rather than empty, so it has to fail
				// here rather than render. Re-runs on every load, so archiving during
				// `dev` reports immediately.
				checkVersions(versions, discoverArchives(contentDir), ARCHIVE_MARKER);
				const { pages, exists } = readPages(host);
				// A page under an outside path contradicts the config whether or not
				// links are checked, so this runs under `broken: 'ignore'` too.
				checkOutsidePaths(pages, indexOptions, links.outside);
				// Checked here only: the docs layout always imports this index, so a
				// bad page fails the build (or raises the dev overlay) once, not once
				// per index.
				const typos = await checkFrontmatter(pages, options.schema);
				if (typos) console.warn(typos);
				// Here for the same reason: once per build, with the pages already read.
				hooks.pagesRead(pages);
				// The newest release marks the pages that are new in it. Watched, so a
				// release in `dev` moves the dots without a restart.
				let latestRelease: string | undefined;
				if (changelogFile && fs.existsSync(changelogFile)) {
					host.watch(changelogFile);
					latestRelease = parseChangelog(fs.readFileSync(changelogFile, 'utf-8'))[0]?.version;
				}
				// Only this index has a date field, so only this one pays for git.
				const docs = contentIndex(withCommitDates(pages, trackedDates()), {
					...indexOptions,
					latestRelease
				});
				warnAboutDocsRoot(contentDir, exists, docs.length);
				const resolved = resolveVersions(versions, docsBase, docs);
				// The pages and the version manifest also go out together, for the shell.
				return { docs, versions: resolved, content: { docs, versions: resolved } };
			}
		},

		search: {
			fromPages: true,
			exports: (host) => ({ docs: searchIndex(readPages(host).pages, indexOptions) })
		},

		llms: {
			fromPages: true,
			// What agents read: each page as agent markdown. Its imports resolve
			// the way Vite resolves the page's own, and each kind reads the way its
			// page side does, so pages without a props import never load TypeScript.
			exports: async (host) => ({
				docs: await llmsIndex(readPages(host).pages, indexOptions, {
					resolve: host.resolve,
					watch: host.watch,
					warn: host.warn,
					...docImportReads(docImports, { addWatchFile: host.watch, warn: host.warn })
				})
			})
		},

		changelog: {
			exports: (host) => {
				if (changelogFile) host.watch(changelogFile);
				return {
					releases: changelogFile
						? collectReleases(changelogFile, changelogOverrides, changelogRoute)
						: [],
					// The route goes out with the releases so the feed links to the page
					// the plugin dated them against, not to a second default.
					changelogPath: changelogRoute
				};
			}
		}
	};

	const nameById = new Map(GENERATED_MODULE_NAMES.map((name) => [idOf(name), name]));
	const idBySpecifier = new Map(
		GENERATED_MODULE_NAMES.map((name) => [specifierOf(name), idOf(name)])
	);

	const read = async <K extends GeneratedModuleName>(name: K, host: GeneratedModuleHost) =>
		await modules[name].exports(host);

	return {
		resolve: (specifier) => idBySpecifier.get(specifier),
		read,
		async load(id, host) {
			const name = nameById.get(id);
			return name && writeModule(await read(name, host));
		},
		builtFromPages: GENERATED_MODULE_NAMES.filter((name) => modules[name].fromPages).map(idOf)
	};
}

/**
 * A module's exports as JavaScript: each one a JSON value, with two
 * exceptions. A {@link DefaultExportOf} is a re-export. And an export that
 * only gathers earlier exports under their own names (`content`, of `docs` and
 * `versions`) is written as references to them, so the data goes out once.
 */
export function writeModule(exports: Record<string, unknown>): string {
	const written = new Map<unknown, string>();
	let code = '';
	for (const [name, value] of Object.entries(exports)) {
		if (value instanceof DefaultExportOf) {
			code += `export { default as ${name} } from ${JSON.stringify(value.file.replaceAll('\\', '/'))};\n`;
			continue;
		}
		const gathered =
			typeof value === 'object' && value !== null && !Array.isArray(value)
				? Object.entries(value)
				: [];
		const references =
			gathered.length > 0 && gathered.every(([key, part]) => written.get(part) === key);
		code += references
			? `export const ${name} = { ${gathered.map(([key]) => key).join(', ')} };\n`
			: `export const ${name} = ${JSON.stringify(value) ?? 'undefined'};\n`;
		if (typeof value === 'object' && value !== null) written.set(value, name);
	}
	return code;
}
