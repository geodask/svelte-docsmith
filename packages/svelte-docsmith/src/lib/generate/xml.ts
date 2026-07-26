/**
 * Shared escaping for the XML documents this layer emits. `sitemap.xml` and the
 * changelog's Atom feed both interpolate site-supplied strings into markup, and
 * both need the same five characters escaped, so the rule lives here rather than
 * once per generator.
 */

/**
 * Escape a string for use as XML text or as an attribute value. All five
 * predefined entities are escaped, rather than the subset each position strictly
 * needs, so a caller can never pick the wrong one.
 */
export function escapeXml(s: string): string {
	return s.replace(/[&<>'"]/g, (c) => {
		switch (c) {
			case '&':
				return '&amp;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case "'":
				return '&apos;';
			default:
				return '&quot;';
		}
	});
}
