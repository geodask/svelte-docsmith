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
import { outsideCodeFences, withFrontmatter } from './markdown-source.js';

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
