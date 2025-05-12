/**
 * Represents a basic TOC item in the navigation
 */
export type TocItem = {
	/**
	 * URL of the TOC item
	 */
	url: string;

	/**
	 * Title of the TOC item
	 */
	title: string;

	/**
	 * Optional nested items
	 */
	items: TocItem[];
};

/**
 * Enhanced TOC item with highlighting information
 */
export type HighlightedTocItem = TocItem & {
	/**
	 * Whether this is the currently highlighted item
	 */
	isHighlighted: boolean;

	/**
	 * Whether this is the primary focused item among all highlighted items
	 * Only one item should have this set to true at a time
	 */
	isFocused: boolean;

	/**
	 * Whether this item has a child that is visible
	 */
	hasVisibleChildren?: boolean;

	/**
	 * Whether this element has children that are focused
	 */
	hasFocusedChildren?: boolean;

	/**
	 * Child items with highlighting information
	 */
	items: HighlightedTocItem[];
};

/**
 * Base configuration for TOC functionality
 */
export type TocBaseOptions = {};

/**
 * Configuration options for the TOC tracking system
 */
export type TocOptions = {
	/**
	 * CSS selector for headings (default: 'h1, h2, h3, h4, h5, h6')
	 */
	headingSelector?: string;

	/**
	 * Attribute used to identify sections (default: 'data-section-id')
	 */
	idAttribute?: string;

	/**
	 * Root margin for the IntersectionObserver (default: '-56px 0px 0px 0px')
	 */
	rootMargin?: string;

	/**
	 * Optional mapper function to convert TOC item URLs to DOM element IDs
	 */
	urlToElementIdMapper?: (url: string) => string;

	/**
	 * Optional mapper function to convert DOM element IDs to TOC item URLs
	 */
	elementIdToUrlMapper?: (id: string) => string;
};

/**
 * Represents an element tracked for visibility
 */
export interface ObservedElement {
	/**
	 * Identifier of the element
	 */
	id: string;

	/**
	 * Whether this element is currently visible in the viewport
	 */
	isVisible: boolean;

	/**
	 * Whether this element is the one with the highest intersection ratio
	 * Used to ensure only one element is active even when multiple are visible
	 */
	isActive?: boolean;

	/**
	 * Whether this element has a child that is visible
	 */
	hasVisibleChildren: boolean;

	/**
	 * Whether this element has children that are focused
	 */
	hasFocusedChildren?: boolean;
}

/**
 * Base interface for any element tracking strategy
 */
export interface ElementObserver {
	/**
	 * Elements being tracked with their highlight status
	 */
	elements: ObservedElement[];
}

/**
 * State returned by the TOC system
 */
export type TocState = {
	/**
	 * Fully processed TOC items ready for rendering
	 */
	items: HighlightedTocItem[];
};
