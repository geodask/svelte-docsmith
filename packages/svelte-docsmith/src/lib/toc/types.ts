/**
 * A table-of-contents entry: one heading scanned from the rendered page.
 */
export type TocItem = {
	/** The heading's `id` (from rehype-slug); the in-page link is `#${id}`. */
	id: string;
	/** Heading text. */
	title: string;
	/** Heading level: `2` for an `h2`, `3` for an `h3`. */
	depth: 2 | 3;
};
