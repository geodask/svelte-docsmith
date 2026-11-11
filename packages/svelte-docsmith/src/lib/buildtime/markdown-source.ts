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

/**
 * A fence opener: indentation, the marker run, and the info string. A backtick
 * fence's info string can't hold a backtick (CommonMark): that line is inline
 * code, which {@link opensFence} checks.
 */
const FENCE_OPEN = /^([ \t]*)(`{3,}|~{3,})([^\n]*)$/;

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

/** A stretch of a page: a run of prose lines, or one fenced code block. */
export type Stretch =
	| {
			kind: 'prose';
			/** The run's lines, in order. Never empty. */
			lines: string[];
	  }
	| {
			kind: 'fence';
			/** The opener's indentation. */
			indent: string;
			/** The opener's marker run: three or more backticks or tildes. */
			marker: string;
			/** The opener's info string, trimmed: the language and any metadata. */
			info: string;
			/** The code between the markers, as written. */
			body: string[];
			/** Every line of the block as written: the opener, the body and the closer. */
			lines: string[];
			/** Whether the block has a closer. An unclosed fence runs to the end of the page. */
			closed: boolean;
	  };

/**
 * Walk a page's lines as prose runs and fenced code blocks: the one fence
 * rule every build-time pass reads a page by.
 *
 * A line-by-line walk rather than one regex pairing fences up, so an indented
 * fence (inside a list item or a component) and a `~~~` fence are both
 * recognised. Per CommonMark a fence closes only on the same character, at
 * least as long as the opener, with no info string, so the ```svelte inside a
 * ```` block opens nothing and closes nothing. A line that only looks like a
 * backtick opener, with a backtick later on it, is inline code and prose.
 *
 * With `setupBlocks`, a `<script>` or `<style>` block starting a prose line is
 * prose through its closing tag, as CommonMark reads such an HTML block, so a
 * fence-like line in its code (a ``` in a template literal) opens nothing.
 *
 * Lines may keep a trailing `\r` (a page split on `\n` alone): it is never
 * part of a marker or an info string.
 */
export function* stretches(
	lines: string[],
	{ setupBlocks = false }: { setupBlocks?: boolean } = {}
): Generator<Stretch> {
	let prose: string[] = [];
	let setupClose: RegExp | undefined;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const open = setupClose ? null : opensFence(line);
		if (!open) {
			if (setupClose) {
				if (setupClose.test(line)) setupClose = undefined;
			} else if (setupBlocks) {
				const setup = SETUP_BLOCK_OPEN.exec(line);
				if (setup) {
					const close = new RegExp(`</${setup[1]}>`, 'i');
					if (!close.test(line.slice(setup[0].length))) setupClose = close;
				}
			}
			prose.push(line);
			continue;
		}
		if (prose.length) yield { kind: 'prose', lines: prose };
		prose = [];

		const closer = new RegExp(`^[ \\t]*${open.marker[0]}{${open.marker.length},}[ \\t]*\\r?$`);
		let end = i + 1;
		while (end < lines.length && !closer.test(lines[end])) end++;
		const closed = end < lines.length;
		yield {
			kind: 'fence',
			...open,
			body: lines.slice(i + 1, end),
			lines: lines.slice(i, closed ? end + 1 : end),
			closed
		};
		i = end;
	}
	if (prose.length) yield { kind: 'prose', lines: prose };
}

/** The fence a line opens, if it opens one. */
function opensFence(line: string): { indent: string; marker: string; info: string } | undefined {
	const match = FENCE_OPEN.exec(line.endsWith('\r') ? line.slice(0, -1) : line);
	if (!match || (match[2][0] === '`' && match[3].includes('`'))) return undefined;
	return { indent: match[1], marker: match[2], info: match[3].trim() };
}

/** Apply `transform` to a page's prose lines, leaving fenced code untouched. */
export function outsideCodeFences(text: string, transform: (line: string) => string): string {
	const out: string[] = [];
	for (const stretch of stretches(text.split('\n'))) {
		out.push(...(stretch.kind === 'prose' ? stretch.lines.map(transform) : stretch.lines));
	}
	return out.join('\n');
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
	const out: string[] = [];
	for (const stretch of stretches(text.split('\n'), options)) {
		if (stretch.kind === 'prose') out.push(transform(stretch.lines.join('\n')));
		else out.push(...stretch.lines);
	}
	return out.join('\n');
}

/** A page's prose lines, in order, with fenced code and its markers dropped. */
export function* proseLines(text: string): Generator<string> {
	for (const stretch of stretches(text.split('\n'))) {
		if (stretch.kind === 'prose') yield* stretch.lines;
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
