/**
 * Build a short plain-text excerpt of `text` centered on the first matching
 * query term, for showing context under a search result. Falls back to the head
 * of the text when nothing matches. Word boundaries are respected so the excerpt
 * never starts or ends mid-word, and elisions are marked with an ellipsis.
 */
export function buildSnippet(text: string, query: string, maxLength = 160): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	if (!clean) return '';

	const haystack = clean.toLowerCase();
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

	let match = -1;
	for (const term of terms) {
		const i = haystack.indexOf(term);
		if (i !== -1 && (match === -1 || i < match)) match = i;
	}

	if (match === -1) {
		return clean.length > maxLength ? clean.slice(0, maxLength).trimEnd() + '…' : clean;
	}

	// Window the text around the match, then snap the edges to word boundaries.
	const half = Math.floor(maxLength / 2);
	let end = Math.min(clean.length, Math.max(match + half, maxLength));
	let start = Math.max(0, end - maxLength);
	end = Math.min(clean.length, start + maxLength);

	if (start > 0) {
		const space = clean.indexOf(' ', start);
		if (space !== -1 && space < match) start = space + 1;
	}
	if (end < clean.length) {
		const space = clean.lastIndexOf(' ', end);
		if (space > match) end = space;
	}

	let snippet = clean.slice(start, end).trim();
	if (start > 0) snippet = '…' + snippet;
	if (end < clean.length) snippet = snippet + '…';
	return snippet;
}
