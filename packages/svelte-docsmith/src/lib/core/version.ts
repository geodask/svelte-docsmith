/**
 * Versioned-docs domain logic. Pure and framework-agnostic: the vite plugin
 * resolves the author's versions against the docs URL base at build time and
 * emits the manifest; `DocsShell` and the switcher read it at runtime.
 *
 * The current version is served unprefixed at the docs root and is the only one
 * anyone edits; superseded releases are frozen copies under their own prefix.
 * See `docs/adr/0001-unprefixed-current-docs.md`. All of it is a no-op when a
 * site declares no versions.
 */
import type { DocsContentItem } from './content.js';
import { navFromContent, flattenNav } from './nav.js';
import { normalizePath } from '../utils/normalize-path.js';

/** One documentation version, declared in the `docsmith()` vite plugin. */
export type DocsVersion = {
	/** Stable id. Also the URL/directory segment for an archived version. */
	id: string;
	/** Label shown in the switcher and banner, e.g. `'v2'`. */
	label: string;
	/** Keep this version out of search engines. Defaults to `false`. */
	noindex?: boolean;
};

/**
 * A site's versions. `current` is the docs for the latest release: it lives at
 * the docs root, is served unprefixed, and is the folder you edit. `archived`
 * holds frozen copies of superseded releases, each in `<docs root>/<id>/`, in
 * the order they should appear in the switcher (newest first).
 */
export type DocsVersions = {
	current: DocsVersion;
	archived?: DocsVersion[];
};

/** A {@link DocsVersion} with the URL fields the runtime needs, computed at build time. */
export type ResolvedVersion = DocsVersion & {
	/** Absolute URL base: the docs root for `current`, `/docs/<id>` for an archive. */
	basePath: string;
	/** The version's first page in sidebar order, for the switcher's fallback. */
	landing: string;
	/** Whether this is the current version (as opposed to an archived one). */
	current: boolean;
	/** Whether search engines should skip this version. */
	noindex: boolean;
};

/** True when `pathname` is `base` or sits beneath it on a segment boundary. */
function underBase(pathname: string, base: string): boolean {
	return pathname === base || pathname.startsWith(base + '/');
}

/**
 * Resolve author versions against the docs URL base (e.g. `/docs`) and the
 * collected content: compute each version's `basePath` and its `landing` (first
 * page in sidebar reading order). Emitted as the `versions` manifest in
 * `svelte-docsmith/content`, current first, then archives in declared order.
 *
 * Returns an empty manifest for an unversioned site, which makes every
 * downstream scoping, switcher and banner step a no-op.
 */
export function resolveVersions(
	versions: DocsVersions | undefined,
	docsBase: string,
	content: DocsContentItem[]
): ResolvedVersion[] {
	if (!versions) return [];
	const base = normalizePath(docsBase);

	const resolve = (version: DocsVersion, basePath: string, current: boolean): ResolvedVersion => {
		const items = content.filter((item) => item.version === version.id);
		return {
			...version,
			basePath,
			landing: flattenNav(navFromContent(items))[0]?.url ?? basePath,
			current,
			noindex: version.noindex ?? false
		};
	};

	return [
		resolve(versions.current, base, true),
		...(versions.archived ?? []).map((version) =>
			resolve(version, normalizePath(base + '/' + version.id), false)
		)
	];
}

/**
 * The resolved version owning `pathname`, by longest matching `basePath`. An
 * archive's base is longer than the current version's, so `/docs/v1/x` picks
 * `v1` while `/docs/x` falls to the current version. `undefined` off the docs
 * tree entirely, or on an unversioned site.
 */
export function activeVersion(
	versions: ResolvedVersion[],
	pathname: string
): ResolvedVersion | undefined {
	const path = normalizePath(pathname);
	let best: ResolvedVersion | undefined;
	for (const v of versions) {
		if (underBase(path, v.basePath) && (!best || v.basePath.length > best.basePath.length)) {
			best = v;
		}
	}
	return best;
}

/** The current version: the docs for the latest release. */
export function currentVersion(versions: ResolvedVersion[]): ResolvedVersion | undefined {
	return versions.find((v) => v.current);
}

/**
 * Keep only the current version's pages, for `sitemap.xml` and `llms.txt`, so
 * search engines and LLMs index one canonical set. A no-op when the site
 * declares no versions. Works over any record carrying `version`.
 */
export function currentOnly<T extends { version?: string }>(
	items: T[],
	versions: ResolvedVersion[]
): T[] {
	const current = currentVersion(versions);
	return current ? items.filter((item) => item.version === current.id) : items;
}

/**
 * Content scoped to one version. With no version id (unversioned site) the
 * content passes through unchanged, so every caller stays a no-op off the
 * versioned path.
 */
export function scopeContent(
	content: DocsContentItem[],
	versionId: string | undefined
): DocsContentItem[] {
	if (!versionId) return content;
	return content.filter((item) => item.version === versionId);
}

/**
 * Map the current page to its equivalent under `to`: swap the version base, and
 * fall back to the target's landing page when that doc doesn't exist there.
 * `targetPaths` is the set of the target version's page URLs.
 */
export function mapPathToVersion(
	pathname: string,
	from: ResolvedVersion,
	to: ResolvedVersion,
	targetPaths: Iterable<string>
): string {
	const path = normalizePath(pathname);
	const rel = underBase(path, from.basePath) ? path.slice(from.basePath.length) : '';
	const candidate = normalizePath(to.basePath + rel);
	const set = targetPaths instanceof Set ? targetPaths : new Set(targetPaths);
	return set.has(candidate) ? candidate : to.landing;
}
