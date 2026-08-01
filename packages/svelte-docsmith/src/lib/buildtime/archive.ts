/**
 * The pure text transforms behind `svelte-docsmith archive-version`. Archiving
 * copies the docs root into a frozen version folder, and a verbatim copy gets
 * two things wrong: its links keep resolving to the current docs, and every page
 * looks like it changed on the day the archive was made. These fix both.
 *
 * Kept here rather than in `bin/` so they are typechecked and unit-tested; the
 * CLI is a thin wrapper over them. See `docs/adr/0002-archives-are-rewritten-source-copies.md`.
 */

import { atBoundary, firstSegmentUnder } from '../utils/url.js';
import { outsideCodeFences, scriptBlocks, withFrontmatter } from './markdown-source.js';

/** Route files at the docs root that an archive nested inside it already inherits. */
export function isInheritedRouteFile(name: string): boolean {
	return /^\+(layout|error)\./.test(name);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Point a page's docs links at the archive it is being copied into. An absolute
 * link like `](/docs/theming)` resolves to the *current* docs forever, so
 * without this an archive silently walks readers into newer content.
 *
 * Links already targeting a version folder are left alone, as are links inside
 * fenced code, which are sample code rather than navigation.
 */
export function rewriteDocsLinks(
	text: string,
	options: { docsBase: string; versionId: string; archivedIds?: Iterable<string> }
): string {
	const { docsBase, versionId } = options;
	// Never double-prefix: skip links into an existing archive, and into the one
	// being created (a page may already point at the id we're about to write).
	const skip = new Set([...(options.archivedIds ?? []), versionId]);
	const pattern = new RegExp(
		`(\\]\\(|href="|href='|\\]:[ \\t]+)(${escapeRe(docsBase)})([^)"'\\s]*)`,
		'g'
	);

	return outsideCodeFences(text, (chunk) =>
		chunk.replace(pattern, (match, prefix: string, base: string, rest: string) => {
			// The regex has already matched the base, so guard the boundary on what
			// follows it: `/docsmith` must not become `/docs/v1mith`.
			if (!atBoundary(rest)) return match;
			const firstSegment = firstSegmentUnder(rest, '');
			if (firstSegment && skip.has(firstSegment)) return match;
			return `${prefix}${base}/${versionId}${rest}`;
		})
	);
}

/**
 * Write a page's real last-updated date into its frontmatter. The collector
 * prefers frontmatter over the git date, so an archive keeps the date each page
 * was actually accurate on instead of the day the archive was created. Leaves an
 * existing `lastUpdated` and any page without frontmatter alone.
 */
export function freezeLastUpdated(text: string, date: string | undefined): string {
	if (!date) return text;
	return withFrontmatter(text, (front) =>
		/^lastUpdated:/m.test(front) ? front : `${front}\nlastUpdated: '${date}'`
	);
}

/**
 * An import's specifier, static or dynamic. The clause between `import` and
 * `from` may not hold a quote or a paren, so the scan cannot run past a
 * side-effect import to borrow a later `from`, and `import.meta.glob('./x')`
 * matches nothing.
 */
const IMPORT = /\bimport\s*\(?\s*(?:[^'"()]*?\bfrom\s*)?['"]([^'"]+)['"]/g;

/** The package an archived page is expected to import, and its subpaths. */
const LIBRARY = 'svelte-docsmith';

/**
 * Whether a relative specifier climbs out of the docs root when resolved from a
 * page `depth` directories inside it. Counting segments rather than resolving
 * real paths keeps the rule pure, and the docs root is the only boundary that
 * matters: where under it a surviving import lands is the archive's business.
 */
function escapesRoot(specifier: string, depth: number): boolean {
	let level = depth;
	for (const segment of specifier.split('/')) {
		if (segment === '..') level--;
		else if (segment !== '.' && segment !== '') level++;
		if (level < 0) return true;
	}
	return false;
}

/**
 * The specifiers a page's `<script>` imports from outside the freeze boundary,
 * deduplicated in source order. `pageDir` is the page's directory relative to
 * the docs root, which is what its relative imports resolve against.
 *
 * Archiving copies the docs root and nothing else, so anything reached from
 * outside it keeps resolving to current code: a live example on an archived
 * page demonstrates the current library rather than the version the page
 * documents, with a green build and nothing said. Hence `$lib`, bare npm
 * specifiers and relative paths that climb out all count, while a relative
 * import landing inside the docs root is frozen along with the page.
 *
 * `svelte-docsmith` itself is never reported. An archived page importing the
 * authoring components is the expected shape, and those are covered by the
 * stability promise rather than by this notice. See
 * `docs/adr/0005-an-archive-freezes-content-not-dependencies.md`.
 */
export function boundaryCrossings(source: string, pageDir: string): string[] {
	const depth = pageDir.split('/').filter(Boolean).length;
	const found = new Set<string>();

	for (const block of scriptBlocks(source)) {
		for (const [, specifier] of block.matchAll(IMPORT)) {
			if (specifier === LIBRARY || specifier.startsWith(`${LIBRARY}/`)) continue;
			// Only a package name can start with something other than a dot, and no
			// package name starts with one, so this is the whole relative/bare split.
			if (specifier.startsWith('.') && !escapesRoot(specifier, depth)) continue;
			found.add(specifier);
		}
	}

	return [...found];
}
