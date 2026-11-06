/**
 * Helpers for type signatures shown as text (props tables). Shared by the
 * build-time extractor and the `Prop` component, so both split a union the
 * same way.
 */

/** Split on `separator` where it isn't nested in brackets or quotes. */
export function splitTopLevel(text: string, separator: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let quote: string | undefined;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (quote) {
			if (ch === '\\') i++;
			else if (ch === quote) quote = undefined;
		} else if (ch === '"' || ch === "'" || ch === '`') {
			quote = ch;
		} else if ('<({['.includes(ch)) {
			depth++;
		} else if ('>)}]'.includes(ch) && !(ch === '>' && text[i - 1] === '=')) {
			depth--;
		} else if (depth === 0 && ch === separator) {
			parts.push(text.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(text.slice(start));
	return parts;
}

/**
 * The members of a top-level union, trimmed: `'a' | Array<B | C>` gives
 * `["'a'", 'Array<B | C>']`. A signature (`() => A | B`) stays whole, since its
 * `|` belongs to the return type.
 */
export function unionMembers(type: string): string[] {
	if (splitTopLevel(type, '=').some((part, i) => i > 0 && part.startsWith('>'))) {
		return [type.trim()];
	}
	return splitTopLevel(type, '|')
		.map((part) => part.trim())
		.filter(Boolean);
}
