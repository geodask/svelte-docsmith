/**
 * The structure of a markdown page, as every build-time pass over one needs to
 * see it: where the frontmatter block ends, and which lines are prose rather
 * than fenced code.
 *
 * Both rules used to be respelled in each pass, and the copies drifted. A fence
 * scanner that toggles on the marker's first character alone closes a ````
 * block on the ```svelte nested inside it, which pulls sample code into the
 * search index and sample headings into the table of contents. Keeping the
 * rules here means the search index, the table of contents, the LLM output and
 * the archive rewriter all agree on what a page's prose is.
 */

/** A page split at its frontmatter delimiters. */
export type MarkdownSource = {
	/** The YAML between the `---` lines, or undefined when the page has none. */
	frontmatter: string | undefined;
	/** Everything after the frontmatter block: prose, headings, fenced code, tags. */
	body: string;
};

/**
 * A page's frontmatter block: `---` on the first line, through the next line
 * that starts with `---`. Group 1 is the YAML; the whole match spans the block
 * including the line break that ends it, so the body starts where it stops.
 *
 * Deliberately as loose about the closing delimiter as remark-frontmatter,
 * which is what mdsvex strips at render time. A stricter rule here would read
 * a page differently from the renderer: a page mdsvex renders body-only would
 * keep its frontmatter as prose, or lose the title that puts it in the nav.
 */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** An opening or closing code fence, indented anywhere on its line. */
const FENCE = /^\s*(`{3,}|~{3,})/;

/** Split a page into its frontmatter and its body. */
export function splitFrontmatter(source: string): MarkdownSource {
	const match = FRONTMATTER.exec(source);
	if (!match) return { frontmatter: undefined, body: source };
	return { frontmatter: match[1], body: source.slice(match[0].length) };
}

/**
 * Rewrite a page's frontmatter YAML in place, leaving the delimiters and the
 * body byte-identical — including their line endings, which a split-and-rejoin
 * would normalise. A page without frontmatter is returned untouched.
 */
export function withFrontmatter(
	source: string,
	transform: (frontmatter: string) => string
): string {
	const match = FRONTMATTER.exec(source);
	if (!match) return source;
	const start = match[0].indexOf('\n') + 1;
	return source.slice(0, start) + transform(match[1]) + source.slice(start + match[1].length);
}

/**
 * A line-by-line scanner for fence state, rather than one regex pairing fences
 * up, so an indented fence (inside a list item or a component) and a `~~~`
 * fence are both recognised. Per CommonMark a fence closes only on the same
 * character, at least as long as the opener, with no info string — so the
 * ```svelte inside a ```` block opens nothing and closes nothing.
 *
 * Returns a predicate that consumes the page's lines in order and answers
 * whether each one is prose. Fence markers themselves are not.
 */
function fenceScanner(): (line: string) => boolean {
	let open: string | undefined;

	return (line) => {
		const match = FENCE.exec(line);
		if (open) {
			const closes =
				match &&
				match[1][0] === open[0] &&
				match[1].length >= open.length &&
				!line.slice(match[0].length).trim();
			if (closes) open = undefined;
			return false;
		}
		if (match) {
			open = match[1];
			return false;
		}
		return true;
	};
}

/** Apply `transform` to a page's prose lines, leaving fenced code untouched. */
export function outsideCodeFences(text: string, transform: (line: string) => string): string {
	const isProse = fenceScanner();
	return text
		.split('\n')
		.map((line) => (isProse(line) ? transform(line) : line))
		.join('\n');
}

/** A page's prose lines, in order, with fenced code and its markers dropped. */
export function* proseLines(text: string): Generator<string> {
	const isProse = fenceScanner();
	for (const line of text.split('\n')) {
		if (isProse(line)) yield line;
	}
}
