/** Markdown writing helpers the kinds' agent sides share. */

/** A backtick fence one longer than the longest backtick run in `text`, and at least `min`. */
export function fenceFor(text: string, min: number): string {
	const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map(([run]) => run.length));
	return '`'.repeat(Math.max(min, longest + 1));
}

/** `text` with `indent` before each non-empty line. */
export function indented(text: string, indent: string): string {
	return text
		.split('\n')
		.map((line) => (line ? indent + line : line))
		.join('\n');
}
