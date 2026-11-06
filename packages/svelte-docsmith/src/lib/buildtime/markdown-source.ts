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

/** The open tag of a `<script>` or `<style>` block, starting a line as HTML may. */
const SETUP_BLOCK_OPEN = /^ {0,3}<(script|style)(?=[\s>]|$)/i;

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
 *
 * With `setupBlocks`, a `<script>` or `<style>` block starting a prose line is
 * prose through its closing tag, as CommonMark reads such an HTML block, so a
 * fence-like line in its code (a ``` in a template literal) opens nothing.
 */
function fenceScanner({ setupBlocks = false } = {}): (line: string) => boolean {
	let open: string | undefined;
	let setupClose: RegExp | undefined;

	return (line) => {
		if (setupClose) {
			if (setupClose.test(line)) setupClose = undefined;
			return true;
		}
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
		const setup = setupBlocks ? SETUP_BLOCK_OPEN.exec(line) : null;
		if (setup) {
			const close = new RegExp(`</${setup[1]}>`, 'i');
			if (!close.test(line.slice(setup[0].length))) setupClose = close;
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

/**
 * Apply `transform` to each run of consecutive prose lines, leaving fenced code
 * and its markers untouched. For rewrites that span lines, such as a component
 * tag with children, which {@link outsideCodeFences} would see a line at a time.
 *
 * With `setupBlocks`, each top-level `<script>`/`<style>` block stays whole
 * inside one run, even when its code has a fence-like line.
 */
export function outsideCodeFenceRuns(
	text: string,
	transform: (prose: string) => string,
	options: { setupBlocks?: boolean } = {}
): string {
	const isProse = fenceScanner(options);
	const out: string[] = [];
	let run: string[] = [];
	const flush = () => {
		if (run.length) out.push(transform(run.join('\n')));
		run = [];
	};
	for (const line of text.split('\n')) {
		if (isProse(line)) {
			run.push(line);
		} else {
			flush();
			out.push(line);
		}
	}
	flush();
	return out.join('\n');
}

/** A page's prose lines, in order, with fenced code and its markers dropped. */
export function* proseLines(text: string): Generator<string> {
	const isProse = fenceScanner();
	for (const line of text.split('\n')) {
		if (isProse(line)) yield line;
	}
}

/**
 * A `<script>` element with any attributes, through its closing tag. The open
 * tag has to start a line, indented no further than CommonMark lets HTML be:
 * four spaces make an indented code block, and mid-line means a sentence about
 * a script tag rather than one. Authoring prose writes `` `<script>` `` in
 * inline code constantly, and a page that only talks about a script block has
 * no script block.
 */
const SCRIPT_BLOCK = /^ {0,3}<script\b[^>]*>([\s\S]*?)<\/script>/gim;

/**
 * The code inside each `<script>` block a page actually runs, in order.
 *
 * Fenced blocks are skipped, which is the whole reason this reads the page
 * through {@link proseLines} rather than scanning the raw text: a docs page
 * about authoring is mostly ```svelte samples that open with a `<script>`, and
 * those are code being displayed, not code the page runs.
 */
export function* scriptBlocks(text: string): Generator<string> {
	const prose = [...proseLines(splitFrontmatter(text).body)].join('\n');
	for (const match of prose.matchAll(SCRIPT_BLOCK)) yield match[1];
}
