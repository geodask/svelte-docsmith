/**
 * The raw HTML a doc page writes in its markdown, as every build-time pass over
 * it needs to read it: which parts are live markup, and which `<a>` tags in
 * them link where.
 *
 * Two passes read raw `<a>`: the broken-link check (`./links.js`) checks each
 * one's href, and the compiler's `rel="external"` step (`./outside-paths.js`)
 * marks each one to an outside path. With a scanner each, they disagreed on
 * unquoted values, on comments and `<script>`/`<style>` bodies, and on values
 * that interpolate. Keeping the rules here means a raw link is checked exactly
 * when it is marked.
 *
 * Pure string work over the HTML as written. Offsets into the result of
 * {@link liveMarkup} are offsets into the HTML it was given, so a caller can
 * read the live markup and edit the original.
 */

/**
 * Markup in raw HTML that never renders: comments, and the bodies of `<script>`
 * and `<style>`, where a tag can only be text in a string.
 */
const NOT_MARKUP = /<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1\s*>/gi;

/**
 * `html` with the markup that never renders (comments, `<script>` and
 * `<style>`) blanked to spaces. Newlines stay, and every other character
 * becomes one space, so offsets and lines in the result are the same as in
 * `html`.
 */
export function liveMarkup(html: string): string {
	return html.replace(NOT_MARKUP, (text) => text.replace(/[^\n]/g, ' '));
}

/**
 * An `<a>` opening tag, its attributes in group 1. Quoted values and Svelte
 * `{…}` attributes are stepped over whole, so a `>` inside either never ends
 * the tag early.
 */
const A_TAG = /<a(\s(?:"[^"]*"|'[^']*'|\{[^}]*\}|[^>"'{])*)>/gi;

/**
 * One attribute: its name in group 1, then its value double-quoted (2),
 * single-quoted (3), a Svelte expression (4) or unquoted (5), as HTML allows.
 * An unquoted value runs over any `{…}` in it, so `href=/x/{slug}` is one
 * value that interpolates rather than `/x/` and a stray expression. A bare
 * `{…}` (shorthand or spread) matches with no name. Matching attribute by
 * attribute is what keeps an `href=` written inside another attribute's value
 * from being read as the tag's own.
 */
const ATTRIBUTE =
	/([^\s"'=<>`{}/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\{[^}]*\})|((?:[^\s"'=<>`{}]|\{[^}]*\})+)))?|\{[^}]*\}/g;

/** A raw `<a>` whose href is known at build time. */
export type RawLink = {
	/** The href, trimmed. */
	href: string;
	/** The offset of the `href` attribute in the HTML, so a tag spread over lines reports the line its link is on. */
	hrefAt: number;
	/**
	 * The tag's `rel` attribute, when it has one: its span in the HTML, and its
	 * value, which is `undefined` for a Svelte expression that can't be read.
	 */
	rel?: { start: number; end: number; value: string | undefined };
	/** The offset just past the tag's last attribute, where a new one goes. */
	insertAt: number;
};

/**
 * Every `<a>` in live markup in `html` (see {@link liveMarkup}) whose href is
 * known at build time, in order. A tag without an href is skipped, as is one
 * whose href is a Svelte expression (`href={…}`) or interpolates one
 * (`"/docs/{slug}"`): it has no path until the page runs. When a tag repeats
 * an attribute, the first counts, as in HTML.
 */
export function rawLinks(html: string): RawLink[] {
	const links: RawLink[] = [];
	for (const tag of liveMarkup(html).matchAll(A_TAG)) {
		const attributesAt = tag.index + '<a'.length;
		let href: { value: string | undefined; at: number } | undefined;
		let rel: RawLink['rel'];
		let insertAt = attributesAt;
		for (const attribute of tag[1].matchAll(ATTRIBUTE)) {
			const start = attributesAt + attribute.index;
			const end = start + attribute[0].length;
			insertAt = end;
			const name = attribute[1]?.toLowerCase();
			const value =
				attribute[4] === undefined
					? (attribute[2] ?? attribute[3] ?? attribute[5] ?? '')
					: undefined;
			if (name === 'href') href ??= { value, at: start };
			if (name === 'rel') rel ??= { start, end, value };
		}
		const value = href?.value?.trim();
		if (!href || !value || value.includes('{')) continue;
		links.push({ href: value, hrefAt: href.at, rel, insertAt });
	}
	return links;
}
