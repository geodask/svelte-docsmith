/**
 * The options of `docsmith()`: the one place a site declares how it is built
 * and what it shows. The Vite plugin, the markdown compiler it runs, and the
 * archive CLI (which loads `vite.config` to read them) all resolve their
 * settings here, so a setting means the same thing to each of them.
 */
import path from 'node:path';
import { checkSite, type DocsmithSite } from '../../core/config.js';
import type { DocsVersions } from '../../core/version.js';
import type { DocsmithMarkdownOptions } from '../markdown.js';
import type { StandardSchemaV1 } from './frontmatter-schema.js';

/** Where the changelog comes from and where it is served. */
export interface DocsmithChangelogOptions {
	/**
	 * Path to the `CHANGELOG.md` that feeds the generated
	 * `svelte-docsmith/changelog` index. Default: `'CHANGELOG.md'` in the app
	 * directory; point it at the package whose releases you publish.
	 */
	file?: string;
	/**
	 * Route the changelog is served at, used to build feed links and to find
	 * hand-written per-release pages. Default: `'/changelog'`.
	 */
	path?: string;
}

/**
 * What a broken link does to the build: `'error'` prints every broken link and
 * fails `vite build`, `'warn'` prints them and builds, `'ignore'` skips the
 * check. `vite dev` only ever warns.
 */
export type BrokenLinksLevel = 'error' | 'warn' | 'ignore';

const BROKEN_LINKS_LEVELS: readonly BrokenLinksLevel[] = ['error', 'warn', 'ignore'];

/** How DocSmith treats the links doc pages write. */
export interface DocsmithLinksOptions {
	/**
	 * What a broken link does: a link from a doc page to a path under the docs
	 * base that is no page of the site. Default: `'error'`, so a typo'd link
	 * never ships.
	 */
	broken?: BrokenLinksLevel;
}

/** The links options with every default applied. */
export interface ResolvedLinksOptions {
	broken: BrokenLinksLevel;
	/**
	 * Outside paths: same-origin path prefixes that something other than this
	 * SvelteKit app serves. Empty unless declared.
	 */
	outside: string[];
}

export interface DocsmithOptions {
	/**
	 * The site config: title, links, SEO defaults and the rest of what
	 * `DocsShell`, `ErrorPage` and the `svelte-docsmith/server` route handlers
	 * show. The plugin checks it at startup and serves it as
	 * `svelte-docsmith/site`, so it must be plain data.
	 */
	site: DocsmithSite;
	/** Directory scanned for doc pages. Default: `'src/routes/docs'`. */
	content?: string;
	/**
	 * Routes root used to derive each page's URL from its location.
	 * Default: `'src/routes'` (so `src/routes/docs/intro/+page.md` → `/docs/intro`).
	 */
	routes?: string;
	/**
	 * Declare documentation versions to enable versioned docs. `current` is the
	 * docs for the latest release: its pages sit directly under `<content>` and
	 * keep their unprefixed URLs. Each archived version's pages live under
	 * `<content>/<id>/` and are served at `/docs/<id>/…`. Omit for a single,
	 * unversioned docs tree (the default).
	 *
	 * @experimental Outside the 1.0 stability promise. May change in a minor
	 * until authors have used versioning for real. An archive freezes content,
	 * not dependencies.
	 */
	versions?: DocsVersions;
	/**
	 * The changelog behind `svelte-docsmith/changelog` and the changelog feed.
	 * Set `false` to skip the changelog entirely.
	 */
	changelog?: DocsmithChangelogOptions | false;
	/**
	 * Shiki themes for every code block: markdown fences and `LiveExample`
	 * source panels alike. Default: github-light/github-dark.
	 */
	themes?: { light: string; dark: string };
	/** How markdown doc pages are compiled. */
	markdown?: DocsmithMarkdownOptions;
	/**
	 * tsconfig used to read prop types for props imports (`?props`), relative
	 * to the Vite root. Default: the root's `tsconfig.json`.
	 *
	 * @experimental Generated props tables are outside the 1.0 stability promise.
	 */
	tsconfig?: string;
	/**
	 * A schema for your pages' custom fields: every frontmatter key besides the
	 * built-in ones, which are always checked. Any Standard Schema works (Zod,
	 * Valibot, ArkType). Make it strict and a key you never declared, like a
	 * typo'd `ordr`, fails the build. It only validates: custom fields reach each
	 * content entry's `data` as written, so leave transforms and defaults out.
	 */
	schema?: StandardSchemaV1;
	/**
	 * How doc pages' links are checked. Which paths the site serves is a fact
	 * about the site rather than about compiling markdown, so it sits here
	 * beside `content` and `routes`, not under `markdown`.
	 */
	links?: DocsmithLinksOptions;
}

/** The options with every default applied and every path made absolute. */
export interface ResolvedDocsmithOptions {
	site: DocsmithSite;
	contentDir: string;
	routesDir: string;
	versions?: DocsVersions;
	/** Absolute path of the changelog file, or `undefined` when it is off. */
	changelogFile?: string;
	/** The route the changelog is served at, even when it is off. */
	changelogPath: string;
	themes?: { light: string; dark: string };
	markdown: DocsmithMarkdownOptions;
	tsconfig?: string;
	schema?: StandardSchemaV1;
	links: ResolvedLinksOptions;
}

/** Options from an older release that now live elsewhere, and where. */
const MOVED: Record<string, string> = {
	changelogPath: '`changelog: { path }`'
};

/**
 * Check `docsmith()`'s options and resolve them against `cwd`. Throws on a
 * missing or malformed `site`, so a bad config fails at startup.
 */
export function resolveOptions(
	options: DocsmithOptions,
	cwd: string = process.cwd()
): ResolvedDocsmithOptions {
	if (typeof options !== 'object' || options === null) {
		throw new Error(
			"[svelte-docsmith] docsmith() needs options with a `site`, e.g. docsmith({ site: { title: 'My Docs' } })."
		);
	}
	for (const [key, to] of Object.entries(MOVED)) {
		if (key in options) {
			throw new Error(`[svelte-docsmith] docsmith({ ${key} }) moved to ${to}.`);
		}
	}
	if (typeof options.changelog === 'string') {
		throw new Error(
			'[svelte-docsmith] docsmith({ changelog }) takes `{ file, path }` or `false`. ' +
				`Write changelog: { file: ${JSON.stringify(options.changelog)} }.`
		);
	}
	const site = checkSite(options.site);
	const changelog = options.changelog === false ? undefined : (options.changelog ?? {});
	return {
		site,
		contentDir: path.resolve(cwd, options.content ?? 'src/routes/docs'),
		routesDir: path.resolve(cwd, options.routes ?? 'src/routes'),
		versions: options.versions,
		changelogFile: changelog && path.resolve(cwd, changelog.file ?? 'CHANGELOG.md'),
		changelogPath: (options.changelog || undefined)?.path ?? '/changelog',
		themes: options.themes,
		markdown: options.markdown ?? {},
		tsconfig: options.tsconfig,
		schema: options.schema,
		links: resolveLinks(options.links)
	};
}

/**
 * Check `links` and apply its defaults. A plain JavaScript config reaches here
 * unchecked, and a typo'd level quietly falling back to the default would leave
 * the author believing they had chosen otherwise, so it fails at startup.
 */
function resolveLinks(links: DocsmithLinksOptions | undefined): ResolvedLinksOptions {
	if (links !== undefined && (typeof links !== 'object' || links === null)) {
		throw new Error(
			"[svelte-docsmith] docsmith({ links }) takes an object, e.g. links: { broken: 'warn' }."
		);
	}
	const broken = links?.broken ?? 'error';
	if (!BROKEN_LINKS_LEVELS.includes(broken)) {
		throw new Error(
			`[svelte-docsmith] links.broken must be 'error', 'warn' or 'ignore', got ${JSON.stringify(broken)}.`
		);
	}
	return { broken, outside: [] };
}
