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
import { join, normalizePath, under } from '../utils/url.js';

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

/**
 * Legal version id. Must start alphanumeric: an archived id is both a directory
 * name and a URL segment, so `.`, `..` and dotfiles would escape the docs root
 * or make a hidden, dead route. The current version's id never becomes a
 * segment, but archiving retires it into one, so the same rule applies to both
 * rather than springing a trap one release later.
 */
const VALID_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Throw unless `id` is a legal version id. Shared by the vite plugin, which
 * checks the ids in `docsmith({ versions })`, and by `archive-version`, which
 * checks the id it is about to turn into a directory. One rule, so an id the
 * command accepts is one the build accepts.
 */
export function assertValidVersionId(id: unknown): asserts id is string {
	if (typeof id !== 'string' || !VALID_ID.test(id)) {
		throw new Error(
			`invalid version id: ${JSON.stringify(id)}\n` +
				`  Start with a letter or digit, then letters, digits, \`.\`, \`-\` or \`_\`.\n` +
				`  An archived id is a directory name and a URL segment, and archiving turns\n` +
				`  today's current id into one.`
		);
	}
}

/** What the docs root actually contains, for {@link checkVersions} to reconcile. */
export type ArchivesOnDisk = {
	/** Ids of directories carrying the archive marker. */
	marked: string[];
	/** Names of every directory directly under the docs root. */
	directories: string[];
};

const list = (ids: Iterable<string>) => [...ids].map((id) => `\`${id}\``).join(', ');

/** The `versions` block to paste, with `archived` reduced to the given ids. */
function configBlock(versions: DocsVersions, archivedIds: string[]): string {
	const entry = (v: DocsVersion) => `{ id: '${v.id}', label: '${v.label}' }`;
	const known = new Map((versions.archived ?? []).map((v) => [v.id, v]));
	const archived = archivedIds.map((id) => entry(known.get(id) ?? { id, label: id }));
	return (
		`  versions: {\n` +
		`    current: ${entry(versions.current)},\n` +
		`    archived: [${archived.join(', ')}]\n` +
		`  }`
	);
}

/**
 * Check the declared versions against the docs root, and throw if they disagree.
 * Called by the vite plugin before {@link resolveVersions}, and by
 * `archive-version` before it writes.
 *
 * Versions are declared by hand in `docsmith()` while archives are directories
 * on disk, so the config and the tree are two independent claims about which
 * versions exist. Neither mismatch is visible in the output: an undeclared
 * archive is merged into the current version and its pages take current-version
 * URLs, and a section folder wrongly declared as an archive drops out of the
 * current sidebar entirely. Both are silent corruption of the content index,
 * which is why this throws rather than warns.
 *
 * The marker file is what tells the two apart. A page is assigned to a version
 * by its first directory segment, so `docs/guides/…` and `docs/v1/…` are the
 * same shape and no name-based rule can distinguish them. See
 * `docs/adr/0003-the-archive-marker-defines-an-archive.md`.
 *
 * Pure: the caller does the filesystem work and passes the result in. A no-op
 * for an unversioned site.
 */
export function checkVersions(
	versions: DocsVersions | undefined,
	disk: ArchivesOnDisk,
	markerName: string
): void {
	if (!versions) return;

	const declared = [versions.current, ...(versions.archived ?? [])];
	for (const version of declared) {
		try {
			assertValidVersionId(version?.id);
		} catch (error) {
			throw new Error(`[svelte-docsmith] ${(error as Error).message}`);
		}
	}

	const seen = new Set<string>();
	for (const { id } of declared) {
		if (seen.has(id)) {
			throw new Error(
				`[svelte-docsmith] duplicate version id: \`${id}\`\n` +
					`  Every version needs its own id; it keys each page to its version.`
			);
		}
		seen.add(id);
	}

	const archivedIds = (versions.archived ?? []).map((v) => v.id);
	const declaredArchives = new Set(archivedIds);

	const undeclared = disk.marked.filter((id) => !declaredArchives.has(id));
	if (undeclared.length) {
		throw new Error(
			`[svelte-docsmith] archived on disk but not declared: ${list(undeclared)}\n` +
				`  Their pages would be merged into the current version and served at\n` +
				`  current-version URLs. Add them to docsmith({ versions }):\n\n` +
				configBlock(versions, [...undeclared, ...archivedIds]) +
				`\n`
		);
	}

	const unmarked = archivedIds.filter((id) => !disk.marked.includes(id));
	if (unmarked.length) {
		const present = unmarked.filter((id) => disk.directories.includes(id));
		const missing = unmarked.filter((id) => !disk.directories.includes(id));
		throw new Error(
			`[svelte-docsmith] declared but not archived on disk: ${list(unmarked)}\n` +
				(missing.length
					? `  No directory for ${list(missing)} under the docs root. Create the archive\n` +
						`  with \`svelte-docsmith archive-version <id>\`, or drop it from \`versions\`.\n`
					: '') +
				(present.length
					? `  ${list(present)} exists but carries no \`${markerName}\`, so it is an ordinary\n` +
						`  section of the current docs. Declaring it as a version would scope its\n` +
						`  pages out of the current sidebar and search. If it really is an archive\n` +
						`  you copied by hand, mark it and the build will accept it.\n`
					: '')
		);
	}
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
		...(versions.archived ?? []).map((version) => resolve(version, join(base, version.id), false))
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
		if (under(path, v.basePath) && (!best || v.basePath.length > best.basePath.length)) {
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
	const rel = under(path, from.basePath) ? path.slice(from.basePath.length) : '';
	const candidate = join(to.basePath, rel);
	const set = targetPaths instanceof Set ? targetPaths : new Set(targetPaths);
	return set.has(candidate) ? candidate : to.landing;
}
