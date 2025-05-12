import type { VisibilityObserverConfig } from './visibility-observer.svelte.js';

/**
 * Extended configuration including a filter function
 */
export interface ElementFinderConfig extends VisibilityObserverConfig {
	/**
	 * Custom filter function to exclude elements from tracking
	 * @param element - The HTML element to evaluate
	 * @param id - The element's ID
	 * @returns true if the element should be tracked, false to exclude it
	 */
	filter?: (element: HTMLElement, id: string) => boolean;
}

/**
 * Finds elements in a container based on selector and filter criteria
 * Provides a standardized implementation across all Observers.
 *
 * @param container - The container element to search within
 * @param config - Configuration for element finding
 * @returns An array of HTML elements that match the criteria
 */
export function findElements(container: HTMLElement, config: ElementFinderConfig): HTMLElement[] {
	const idAttribute = config.idAttribute || 'id';
	const selector = buildSelector(idAttribute, config.selector);
	const elements = queryElements(container, selector);

	return config.filter ? filterElements(elements, idAttribute, config.filter) : elements;
}

/**
 * Builds the selector string for querying elements
 */
function buildSelector(idAttribute: string, additionalSelector?: string): string {
	return additionalSelector ? `[${idAttribute}]${additionalSelector}` : `[${idAttribute}]`;
}

/**
 * Queries elements from the container using the selector
 */
function queryElements(container: HTMLElement, selector: string): HTMLElement[] {
	return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
}

/**
 * Filters elements based on the provided filter function
 */
function filterElements(
	elements: HTMLElement[],
	idAttribute: string,
	filterFn: (element: HTMLElement, id: string) => boolean
): HTMLElement[] {
	return elements.filter((element) => {
		const id = element.getAttribute(idAttribute) || '';
		return filterFn(element, id);
	});
}
