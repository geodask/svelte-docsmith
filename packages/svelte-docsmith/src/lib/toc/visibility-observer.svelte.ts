import { browser } from '$app/environment';
import { untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { findElements } from './find-elements.js';
import type { ElementObserver as ElementObserver } from './types.js';

/**
 * Configuration for the visibility Observer
 */
export type VisibilityObserverConfig = {
	/**
	 * Attribute used to select element. Its value is used as the element ID.
	 * Default: 'id'
	 */
	idAttribute?: string;

	/**
	 * Optional selector to filter elements
	 */
	selector?: string;

	/**
	 * Custom filter function to exclude elements from tracking
	 * @param element - The HTML element to evaluate
	 * @param id - The element's ID
	 * @returns true if the element should be tracked, false to exclude it
	 */
	filter?: (element: HTMLElement, id: string) => boolean;

	/**
	 * Root margin for intersection observer (default: '0px')
	 */
	rootMargin?: string;

	/**
	 * Threshold for intersection observer (default: 0)
	 * Value between 0 and 1 indicating what percentage of the element should be visible
	 */
	threshold?: number | number[];
};

/**
 * Element entry type for internal tracking
 */
type ElementEntry = {
	id: string;
	visible: boolean;
	active: boolean;
	hasFocusedChildren: boolean;
	hasVisibleChildren: boolean;
	intersectionRatio: number;
};

/**
 * Visible element information for tracking
 */
type VisibleElement = {
	id: string;
	element: Element;
	intersectionRatio: number;
};

/**
 * Create a visibility observer to observe element visibility using IntersectionObserver
 *
 * @param rootFn - Function that returns the root element containing the elements to track
 * @param config - Configuration for the visibility Observer
 * @returns ElementObserver object
 */
export function visibilityObserver(
	rootFn: () => HTMLElement | null,
	config?: Partial<VisibilityObserverConfig>
): ElementObserver {
	if (!browser) return { elements: [] };

	const elementMap = new SvelteMap<string, ElementEntry>();
	const root = $derived(rootFn());
	const _config = createDefaultConfig(config);
	let _observer = createIntersectionObserver(_config, elementMap, updateActiveElement);

	function updateActiveElement() {
		const allVisibleElements = collectVisibleElements(_config.idAttribute, elementMap);
		resetElementStates(elementMap);
		processActiveElement(allVisibleElements, _config.idAttribute, elementMap);
		processVisibleElementParents(allVisibleElements, _config.idAttribute, elementMap);
	}

	$effect(() => {
		_observer?.disconnect();
		if (!root) return;

		setupElementObservation(root, _config, elementMap, _observer);
		setTimeout(updateActiveElement, 100);
	});

	const trackedElements = $derived.by(() => mapToObservedElements(elementMap));

	return {
		get elements() {
			return trackedElements;
		}
	};
}

/**
 * Create default configuration with sensible values
 */
function createDefaultConfig(config?: Partial<VisibilityObserverConfig>) {
	return {
		idAttribute: 'id',
		rootMargin: '0px',
		threshold: Array.from({ length: 21 }, (_, i) => i / 20),
		...config
	};
}

/**
 * Create a new intersection observer
 */
function createIntersectionObserver(
	config: VisibilityObserverConfig,
	elementMap: SvelteMap<string, ElementEntry>,
	updateCallback: () => void
): IntersectionObserver {
	return new IntersectionObserver(
		(entries) => {
			let needsUpdate = false;

			entries.forEach((entry) => {
				const id = entry.target.getAttribute(config.idAttribute || 'id');
				if (id && elementMap.has(id)) {
					const currentElement = elementMap.get(id);
					elementMap.set(id, {
						...currentElement!,
						visible: entry.isIntersecting,
						intersectionRatio: entry.intersectionRatio
					});
					needsUpdate = true;
				}
			});

			if (needsUpdate) {
				updateCallback();
			}
		},
		{
			rootMargin: config.rootMargin,
			threshold: config.threshold
		}
	);
}

/**
 * Collect all visible elements with their intersection ratios
 */
function collectVisibleElements(
	idAttribute: string,
	elementMap: SvelteMap<string, ElementEntry>
): VisibleElement[] {
	const allVisibleElements: VisibleElement[] = [];
	const allElements = document.querySelectorAll(`[${idAttribute}]`);

	allElements.forEach((element) => {
		const id = element.getAttribute(idAttribute);
		if (id && elementMap.has(id)) {
			const mapEntry = elementMap.get(id);
			if (mapEntry?.visible) {
				allVisibleElements.push({
					id,
					element,
					intersectionRatio: mapEntry.intersectionRatio
				});
			}
		}
	});

	return allVisibleElements.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
}

/**
 * Reset all element states to default values
 */
function resetElementStates(elementMap: SvelteMap<string, ElementEntry>): void {
	elementMap.forEach((value, id) => {
		elementMap.set(id, {
			...value,
			active: false,
			hasFocusedChildren: false,
			hasVisibleChildren: false
		});
	});
}

/**
 * Process the most active element (highest intersection ratio)
 */
function processActiveElement(
	visibleElements: VisibleElement[],
	idAttribute: string,
	elementMap: SvelteMap<string, ElementEntry>
): void {
	if (visibleElements.length === 0) return;

	const activeElement = visibleElements[0];
	const activeId = activeElement.id;

	if (elementMap.has(activeId)) {
		const mapEntry = elementMap.get(activeId);
		elementMap.set(activeId, { ...mapEntry!, active: true });
		markParentElementsAsFocused(activeElement.element, idAttribute, elementMap);
	}
}

/**
 * Mark parent elements as having focused children
 */
function markParentElementsAsFocused(
	element: Element,
	idAttribute: string,
	elementMap: SvelteMap<string, ElementEntry>
): void {
	let parentElement = element.parentElement;
	while (parentElement) {
		const parentId = parentElement.getAttribute(idAttribute);
		if (parentId && elementMap.has(parentId)) {
			const parentEntry = elementMap.get(parentId);
			elementMap.set(parentId, { ...parentEntry!, hasFocusedChildren: true });
		}
		parentElement = parentElement.parentElement;
	}
}

/**
 * Process parent elements of all visible elements
 */
function processVisibleElementParents(
	visibleElements: VisibleElement[],
	idAttribute: string,
	elementMap: SvelteMap<string, ElementEntry>
): void {
	visibleElements.forEach(({ element }) => {
		markParentElementsAsVisible(element, idAttribute, elementMap);
	});
}

/**
 * Mark parent elements as having visible children
 */
function markParentElementsAsVisible(
	element: Element,
	idAttribute: string,
	elementMap: SvelteMap<string, ElementEntry>
): void {
	let parentElement = element.parentElement;
	while (parentElement) {
		const parentId = parentElement.getAttribute(idAttribute);
		if (parentId && elementMap.has(parentId)) {
			const parentEntry = elementMap.get(parentId);
			elementMap.set(parentId, { ...parentEntry!, hasVisibleChildren: true });
		}
		parentElement = parentElement.parentElement;
	}
}

/**
 * Set up observation for all elements
 */
function setupElementObservation(
	root: HTMLElement,
	config: VisibilityObserverConfig,
	elementMap: SvelteMap<string, ElementEntry>,
	observer: IntersectionObserver
): void {
	const elements = findElements(root, config);
	elementMap.clear();

	elements.forEach((element) => {
		const id = element.getAttribute(config.idAttribute || 'id');
		if (id) {
			untrack(() => elementMap).set(id, {
				id,
				visible: false,
				active: false,
				hasFocusedChildren: false,
				hasVisibleChildren: false,
				intersectionRatio: 0
			});
			observer?.observe(element);
		}
	});
}

/**
 * Map internal elements to the ObservedElement interface
 */
function mapToObservedElements(elementMap: SvelteMap<string, ElementEntry>): {
	id: string;
	isVisible: boolean;
	isActive: boolean;
	hasVisibleChildren: boolean;
	hasFocusedChildren: boolean;
}[] {
	return Array.from(elementMap.values()).map(
		({ id, visible, active, hasFocusedChildren, hasVisibleChildren }) => ({
			id,
			isVisible: visible,
			isActive: active,
			hasVisibleChildren,
			hasFocusedChildren
		})
	);
}
