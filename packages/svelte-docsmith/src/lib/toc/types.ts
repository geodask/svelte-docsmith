/**
 * A table-of-contents entry: a heading with a link and any nested entries.
 */
export type TocItem = {
	/** In-page URL of the heading (e.g. `#installation`). */
	url: string;
	/** Heading text. */
	title: string;
	/** Nested entries (e.g. h3s under an h2). */
	items: TocItem[];
};

/**
 * A {@link TocItem} enriched with live scroll-tracking state.
 */
export type HighlightedTocItem = TocItem & {
	/** This entry's section is currently visible. */
	isHighlighted: boolean;
	/** This entry is the primary section in view (only one at a time). */
	isFocused: boolean;
	/** A descendant entry's section is visible. */
	hasVisibleChildren?: boolean;
	/** A descendant entry is the focused one. */
	hasFocusedChildren?: boolean;
	/** Nested entries with their own highlight state. */
	items: HighlightedTocItem[];
};

/**
 * Options for {@link reactiveToc}.
 */
export type TocOptions = {
	/** Attribute identifying a section element. Default: `'data-section-id'`. */
	idAttribute?: string;
	/** Root margin for the IntersectionObserver. Default: `'-56px 0px 0px 0px'`. */
	rootMargin?: string;
	/** Map a TOC item's URL to the section element's id. Default: strip a leading `#`. */
	urlToElementIdMapper?: (url: string) => string;
};
