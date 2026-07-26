/**
 * The pure text transforms behind `svelte-docsmith archive-version`. Archiving
 * copies the docs root into a frozen version folder, and a verbatim copy gets
 * two things wrong: its links keep resolving to the current docs, and every page
 * looks like it changed on the day the archive was made. These fix both.
 *
 * Kept here rather than in `bin/` so they are typechecked and unit-tested; the
 * CLI is a thin wrapper over them. See `docs/adr/0002-archives-are-rewritten-source-copies.md`.
 */

/** Route files at the docs root that an archive nested inside it already inherits. */
export function isInheritedRouteFile(name: string): boolean {
	return /^\+(layout|error)\./.test(name);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Apply `transform` to a markdown source's prose, leaving fenced code untouched.
 *
 * Tracks fences line by line rather than pairing them with one regex, so an
 * indented fence (inside a list item or a component) and a `~~~` fence are both
 * protected. A fence closes on the same character, at least as long, with no
 * info string, per CommonMark.
 */
export function outsideCodeFences(text: string, transform: (chunk: string) => string): string {
	let open: string | undefined;
	return text
		.split('\n')
		.map((line) => {
			const match = /^\s*(`{3,}|~{3,})/.exec(line);
			if (open) {
				const closes =
					match &&
					match[1][0] === open[0] &&
					match[1].length >= open.length &&
					!line.slice(match[0].length).trim();
				if (closes) open = undefined;
				return line;
			}
			if (match) {
				open = match[1];
				return line;
			}
			return transform(line);
		})
		.join('\n');
}

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
			// Guard the segment boundary: `/docsmith` must not become `/docs/v1mith`.
			if (rest && !/^[/#?]/.test(rest)) return match;
			const firstSegment = rest.startsWith('/') ? rest.slice(1).split(/[/#?]/)[0] : '';
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
	if (!date || !text.startsWith('---')) return text;
	const end = text.indexOf('\n---', 3);
	if (end === -1) return text;
	const front = text.slice(0, end);
	if (/^lastUpdated:/m.test(front)) return text;
	return `${front}\nlastUpdated: '${date}'${text.slice(end)}`;
}
