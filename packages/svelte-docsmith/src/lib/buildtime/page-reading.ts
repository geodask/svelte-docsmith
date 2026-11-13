/**
 * A doc page's markdown, read once: its headings with the ids the compiled
 * page gives them, every anchor it has, and every link it writes.
 *
 * The table of contents, the search index's headings and the broken-link check
 * all ask this one reading, so the id a table of contents links to is the id
 * the check says the page has, and both are the id `rehype-slug` renders. Each
 * used to read headings its own way (a line regex here, a markdown parse
 * there), and they disagreed: on an underscore, on a heading in a list, on a
 * line inside an HTML block, and on how a repeated heading is numbered.
 *
 * Read from a markdown parse (marked, GFM as mdsvex reads pages), so headings,
 * tags and links in fenced, indented or inline code are code, and give the
 * page nothing. A test compiles a page and pins these ids to the ones it
 * renders.
 */
import GithubSlugger from 'github-slugger';
import { Marked, type Token, type Tokens } from 'marked';
import { splitFrontmatter } from './markdown-source.js';
import { liveMarkup, rawLinks } from './raw-html.js';

/** One heading of a page, of any level. */
export type Heading = {
	depth: 1 | 2 | 3 | 4 | 5 | 6;
	/**
	 * The id the compiled page gives it: `rehype-slug`'s, from one
	 * `github-slugger` per page fed every heading in order, so a repeated
	 * heading gets `-1`, `-2` as it does there. Empty when the heading has no
	 * text a slug keeps.
	 */
	id: string;
	/** Its text as a reader sees it: inline markdown and tags gone. */
	title: string;
};

/** A link written in a page, before anything has decided what it points at. */
export type WrittenLink = {
	/** The link's target as written. */
	href: string;
	/** The 1-based line of the file it starts on, frontmatter included. */
	line: number;
};

export type PageReading = {
	/** Every heading, in page order. */
	headings: Heading[];
	/**
	 * Every anchor the page has, in page order: each heading's id, and each
	 * `id` written by hand on an HTML tag in its markdown.
	 */
	anchors: string[];
	/**
	 * The markdown links and raw `<a>` tags the page writes, in order. Reference
	 * links arrive with their definition's target. Images are not links to pages.
	 */
	links: WrittenLink[];
};

/**
 * A private instance, so an extension someone registers on marked's shared
 * one can't change how pages are read. GFM, as mdsvex reads pages, so links in
 * tables are seen.
 */
const markdown = new Marked({ gfm: true });

/** Readings by page source, so the passes over one read of the docs share them. */
const readings = new Map<string, PageReading>();
const MAX_READINGS = 2000;

/** Read a page's source, frontmatter included. The same source is parsed once. */
export function readPage(source: string): PageReading {
	let reading = readings.get(source);
	if (!reading) {
		// Oldest out: a long dev session re-reads edited pages, and none of the
		// sources it has moved on from will be asked for again.
		if (readings.size >= MAX_READINGS) readings.delete(readings.keys().next().value!);
		readings.set(source, (reading = read(source)));
	}
	return reading;
}

/**
 * One walk of the parse. marked's top-level tokens slice the body exactly, so
 * each block's offset is exact. Within a block, nested tokens may have had a
 * list's indentation or a quote's `>` stripped from their continuation lines,
 * but never from their first line, so each link is found by its first line,
 * searching on from the last link or code span found. Stepping past code spans
 * too is what stops a link written earlier in inline code from claiming the
 * real link's line.
 */
function read(source: string): PageReading {
	const { body } = splitFrontmatter(source);
	const text = body.replace(/\r\n?/g, '\n');
	const slugger = new GithubSlugger();
	const headings: Heading[] = [];
	const anchors = new Set<string>();
	const links: WrittenLink[] = [];
	let blockLine = 1 + newlines(source.slice(0, source.length - body.length));

	for (const block of markdown.lexer(text)) {
		let cursor = 0;
		/** The line a token starts on, found from its first line in the block. */
		const lineOf = (token: Token) => {
			const firstLine = token.raw.split('\n', 1)[0];
			const at = block.raw.indexOf(firstLine, cursor);
			const start = at === -1 ? cursor : at;
			if (at !== -1) cursor = at + firstLine.length;
			return blockLine + newlines(block.raw.slice(0, start));
		};
		const visit = (token: Token, inLink = false) => {
			if (token.type === 'heading') {
				const heading = token as Tokens.Heading;
				const headingText = textOf(heading.tokens);
				const id = slugger.slug(headingText);
				if (id) anchors.add(id);
				headings.push({
					depth: heading.depth as Heading['depth'],
					id,
					title: headingText.replace(/\s+/g, ' ').trim()
				});
			}
			if (token.type === 'html') for (const id of writtenIds(token.raw)) anchors.add(id);
			// A link's own text holds no further link, and its code spans and tags
			// lie inside the span already stepped past.
			if (
				!inLink &&
				(token.type === 'link' || token.type === 'codespan' || token.type === 'html')
			) {
				const line = lineOf(token);
				if (token.type === 'link') links.push({ href: (token as Tokens.Link).href, line });
				if (token.type === 'html') {
					for (const { href, hrefAt } of rawLinks(token.raw)) {
						links.push({ href, line: line + newlines(token.raw.slice(0, hrefAt)) });
					}
				}
				childrenOf(token).forEach((child) => visit(child, true));
				return;
			}
			childrenOf(token).forEach((child) => visit(child, inLink));
		};
		visit(block);
		blockLine += newlines(block.raw);
	}

	return { headings, anchors: [...anchors], links };
}

/** A token's nested tokens, wherever its type keeps them. */
function childrenOf(token: Token): Token[] {
	if (token.type === 'table') {
		const table = token as Tokens.Table;
		return [...table.header, ...table.rows.flat()].flatMap((cell) => cell.tokens);
	}
	if (token.type === 'list') return (token as Tokens.List).items;
	return 'tokens' in token && Array.isArray(token.tokens) ? token.tokens : [];
}

function newlines(text: string): number {
	let count = 0;
	for (const char of text) if (char === '\n') count++;
	return count;
}

/**
 * A heading's text as `rehype-slug` reads it from the compiled heading: the
 * text of its text nodes. So inline code keeps its text, a link or emphasis
 * gives its own, and an inline tag or image gives nothing.
 *
 * marked hands over text as written, where mdsvex has already decoded entities
 * and run smartypants, which turns `--` into an em dash. Both are redone here,
 * as far as a slug can tell them apart (see {@link decodeEntities}).
 */
function textOf(tokens: Token[] = []): string {
	return tokens
		.map((token) => {
			if (token.type === 'escape' || token.type === 'codespan') return token.text as string;
			if (token.type === 'text' && !token.tokens?.length) {
				return decodeEntities(token.text as string).replace(/(?<!-)--(?!-)/g, '—');
			}
			if (token.type === 'html' || token.type === 'image') return '';
			return 'tokens' in token && Array.isArray(token.tokens) ? textOf(token.tokens) : '';
		})
		.join('');
}

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

/**
 * Decode the character references in heading text. Numeric ones and the
 * common named ones decode exactly. Any other named one decodes to nothing:
 * nearly all of them name a symbol, which `github-slugger` drops anyway, where
 * leaving it would slug its name (`&copy;` as `copy`). An entity for a letter
 * (`&eacute;`) is the one case this gets wrong; a heading would write `é`.
 */
function decodeEntities(text: string): string {
	return text.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]*);/gi, (_, name: string) => {
		if (name[0] !== '#') return NAMED_ENTITIES[name] ?? '';
		const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : +name.slice(1);
		return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
	});
}

/**
 * The `id`s written on tags in a piece of HTML: quoted either way, or bare.
 * `id={...}` is a Svelte expression, unknown until the page runs, so it gives
 * no anchor. Only live markup counts (see `liveMarkup`): a tag in a comment or
 * in a script or style body never renders, so its `id` is no anchor.
 */
function writtenIds(html: string): string[] {
	const tags = liveMarkup(html);
	const ids = tags.matchAll(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`{}]+))/g);
	return [...ids].map((match) => match[1] ?? match[2] ?? match[3]).filter(Boolean);
}
