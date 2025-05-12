import type {
	ElementObserver,
	HighlightedTocItem,
	TocItem,
	TocOptions,
	TocState,
	ObservedElement
} from './types.js';
import { visibilityObserver } from './visibility-observer.svelte.js';

/**
 * Sets up TOC tracking and returns highlighted TOC items ready for rendering
 *
 * @param initialItemsFn Function that returns the initial TOC items
 * @param contentElementFn Function that returns the content element to track
 * @param options Configuration options for the TOC system
 * @returns TOC state with processed items
 */
export function reactiveToc(
	initialItemsFn: () => TocItem[],
	contentElementFn: () => HTMLElement | null,
	options: TocOptions = {}
): TocState {
	const config = createTocConfig(options);
	const urlToIdMapper = options.urlToElementIdMapper || defaultUrlToIdMapper;
	const baseTocItems: TocItem[] = $derived(initialItemsFn());

	const Observer: ElementObserver = visibilityObserver(contentElementFn, {
		idAttribute: config.idAttribute,
		rootMargin: config.rootMargin,
		filter: (element) => element.getAttribute('data-heading-rank') !== '1'
	});

	const items = $derived.by(() => {
		const rawItems = addHighlightingToItems(baseTocItems, Observer.elements, urlToIdMapper);
		return addParentHighlighting(rawItems);
	});

	return {
		get items() {
			return items;
		}
	};
}

/**
 * Default URL to ID mapper function
 * @param url URL to be converted
 * @returns	ID string
 */
function defaultUrlToIdMapper(url: string): string {
	return url.startsWith('#') ? url.substring(1) : url;
}

/**
 * Creates a configuration object with default values merged with user options
 *
 * @param options User-provided options
 * @returns Complete configuration object
 */
function createTocConfig(options: TocOptions) {
	return {
		idAttribute: 'data-section-id',
		headingSelector: 'h2, h3, h4, h5, h6',
		rootMargin: '-56px 0px 0px 0px',
		...options
	};
}

/**
 * Enhance items with parent highlighting
 */
function addParentHighlighting(items: HighlightedTocItem[]): HighlightedTocItem[] {
	return items.map((item) => {
		const hasHighlightedChild = checkForHighlightedChildren(item.items);
		const hasFocusedChild = checkForFocusedChildren(item.items);
		const hasVisibleChildren = Boolean(hasHighlightedChild);

		return {
			...item,
			hasVisibleChildren,
			hasFocusedChildren: Boolean(hasFocusedChild),
			items: item.items ? addParentHighlighting(item.items) : []
		};
	});
}

/**
 * Check if any child items are highlighted
 */
function checkForHighlightedChildren(items?: HighlightedTocItem[]): boolean {
	if (!items || items.length === 0) return false;

	for (const item of items) {
		if (item.isHighlighted) return true;
		if (checkForHighlightedChildren(item.items)) return true;
	}

	return false;
}

/**
 * Check if any child items are focused
 */
function checkForFocusedChildren(items?: HighlightedTocItem[]): boolean {
	if (!items || items.length === 0) return false;

	for (const item of items) {
		if (item.isFocused) return true;
		if (checkForFocusedChildren(item.items)) return true;
	}

	return false;
}

/**
 * Enhances TOC items with highlighting information from tracked elements
 *
 * @param tocItems Base TOC items without highlighting information
 * @param trackedElements Elements being tracked with their highlight status
 * @param urlToIdMapper Function to convert TOC item URLs to element IDs
 * @returns TOC items enhanced with highlight information
 */
function addHighlightingToItems(
	tocItems: TocItem[],
	trackedElements: ObservedElement[],
	urlToIdMapper: (url: string) => string = defaultUrlToIdMapper
): HighlightedTocItem[] {
	return tocItems.map((item) => {
		const elementId = urlToIdMapper(item.url);
		const trackedElement = trackedElements.find((el) => el.id === elementId);

		return createHighlightedItem(item, trackedElement, trackedElements, urlToIdMapper);
	});
}

/**
 * Creates a highlighted TOC item with visibility status
 */
function createHighlightedItem(
	item: TocItem,
	trackedElement: ObservedElement | undefined,
	trackedElements: ObservedElement[],
	urlToIdMapper: (url: string) => string
): HighlightedTocItem {
	const isHighlighted = trackedElement?.isVisible ?? false;
	const isFocused = trackedElement?.isActive ?? false;
	const hasVisibleChildren = trackedElement?.hasVisibleChildren ?? false;

	return {
		...item,
		isHighlighted,
		isFocused,
		hasVisibleChildren,
		items: item.items ? addHighlightingToItems(item.items, trackedElements, urlToIdMapper) : []
	};
}
