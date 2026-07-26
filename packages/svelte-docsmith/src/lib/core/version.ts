/**
 * Versioned-docs domain logic. Pure and framework-agnostic: the vite plugin
 * resolves the author's versions against the docs URL base at build time and
 * emits the manifest; `DocsShell` and the switcher read it at runtime. All of it
 * is a no-op when a site declares no versions.
 */
import type { DocsContentItem } from './content.js';
import { navFromContent, flattenNav } from './nav.js';
import { normalizePath } from '../utils/normalize-path.js';

/** A documentation version, declared in the `docsmith()` vite plugin. */
export type DocsVersion = {
	/** Stable id, used in the content index and as the switcher key. */
	id: string;
	/** Label shown in the switcher and banner, e.g. `'v2 (latest)'`. */
	label: string;
	/** URL/directory segment under the docs root, e.g. `'v2'` → `/docs/v2`. */
	path: string;
	/** The default readers get; the bare docs root redirects here. Exactly one. */
	latest?: boolean;
	/** An unreleased "next": kept out of search engines and shown with a preview banner. */
	prerelease?: boolean;
	/** Force search-engine `noindex`. Defaults to `true` for a prerelease, else `false`. */
	noindex?: boolean;
};

/** A {@link DocsVersion} with the URL fields the runtime needs, computed at build time. */
export type ResolvedVersion = DocsVersion & {
	/** Absolute URL base, e.g. `/docs/v2`. */
	basePath: string;
	/** The version's first page in sidebar order, for the redirect + switcher fallback. */
	landing: string;
	/** Whether search engines should skip this version. */
	noindex: boolean;
};

/** True when `pathname` is `base` or sits beneath it on a segment boundary. */
function underBase(pathname: string, base: string): boolean {
	return pathname === base || pathname.startsWith(base + '/');
}

/**
 * Resolve author versions against the docs URL base (e.g. `/docs`) and the
 * collected content: compute each version's `basePath`, its `landing` (first
 * page in sidebar reading order), and its effective `noindex`. Emitted as the
 * `versions` manifest in `svelte-docsmith/content`.
 */
export function resolveVersions(
	versions: DocsVersion[],
	docsBase: string,
	content: DocsContentItem[]
): ResolvedVersion[] {
	const base = normalizePath(docsBase);
	return versions.map((v) => {
		const basePath = normalizePath(base + '/' + v.path.replace(/^\/+|\/+$/g, ''));
		const items = content.filter((item) => item.version === v.id);
		const landing = flattenNav(navFromContent(items))[0]?.url ?? basePath;
		return { ...v, basePath, landing, noindex: v.noindex ?? Boolean(v.prerelease) };
	});
}

/**
 * The resolved version owning `pathname`, by longest matching `basePath`
 * (so `/docs/v2/x` picks `v2`, not a shorter sibling). `undefined` when no
 * version matches (e.g. the bare docs root, or an unversioned site).
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

/** The version flagged `latest` (the default readers get). */
export function latestVersion(versions: ResolvedVersion[]): ResolvedVersion | undefined {
	return versions.find((v) => v.latest);
}

/** The latest released version's landing URL — the target for the bare `/docs` redirect. */
export function latestLandingUrl(versions: ResolvedVersion[]): string | undefined {
	return latestVersion(versions)?.landing;
}

/**
 * Keep only the latest released version's pages — for `sitemap.xml` and
 * `llms.txt`, so search engines and LLMs index one canonical set. A no-op when
 * the site declares no versions. Works over any record carrying `version`.
 */
export function latestOnly<T extends { version?: string }>(
	items: T[],
	versions: ResolvedVersion[]
): T[] {
	const latest = latestVersion(versions);
	return latest ? items.filter((item) => item.version === latest.id) : items;
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
