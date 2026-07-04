import { BROWSER as browser } from 'esm-env';
import { untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

/**
 * Configuration for the visibility observer.
 */
export type VisibilityObserverConfig = {
	/**
	 * Attribute used to select elements. Its value is used as the element id.
	 * Default: `'id'`.
	 */
	idAttribute?: string;

	/**
	 * Optional selector appended to the id-attribute selector to narrow the set
	 * of tracked elements.
	 */
	selector?: string;

	/**
	 * Custom filter to exclude elements from tracking.
	 * @param element - The HTML element to evaluate
	 * @param id - The element's id
	 * @returns true to track the element, false to exclude it
	 */
	filter?: (element: HTMLElement, id: string) => boolean;

	/**
	 * Root margin for the IntersectionObserver. Default: `'0px'`.
	 */
	rootMargin?: string;

	/**
	 * Threshold for the IntersectionObserver. Default: 21 evenly-spaced steps.
	 */
	threshold?: number | number[];
};

/**
 * A tracked element with its live visibility state.
 */
export interface ObservedElement {
	/** The element's id. */
	id: string;
	/** The element is currently intersecting the viewport. */
	isVisible: boolean;
	/** The element has the highest intersection ratio among visible elements. */
	isActive?: boolean;
	/** A descendant element is visible. */
	hasVisibleChildren: boolean;
	/** A descendant element is the active one. */
	hasFocusedChildren?: boolean;
}

/**
 * The reactive result of {@link visibilityObserver}: the tracked elements with
 * their highlight state.
 */
export interface ElementObserver {
	elements: ObservedElement[];
}

/**
 * Internal per-element tracking entry. Holds the live `Element` reference so
 * parent walks and visibility collection never re-query the document.
 */
type ElementEntry = {
	id: string;
	element: Element;
	visible: boolean;
	active: boolean;
	hasFocusedChildren: boolean;
	hasVisibleChildren: boolean;
	intersectionRatio: number;
};

/**
 * Visible element information used while recomputing highlight state.
 */
type VisibleElement = {
	id: string;
	element: Element;
	intersectionRatio: number;
};

/**
 * Observe element visibility within a root using IntersectionObserver.
 *
 * @param rootFn - Returns the root element containing the elements to track
 * @param config - Configuration for the visibility observer
 * @returns An {@link ElementObserver} exposing reactive tracked elements
 */
export function visibilityObserver(
	rootFn: () => HTMLElement | null,
	config?: Partial<VisibilityObserverConfig>
): ElementObserver {
	if (!browser) return { elements: [] };

	const elementMap = new SvelteMap<string, ElementEntry>();
	const root = $derived(rootFn());
	const _config = createDefaultConfig(config);

	function updateActiveElement() {
		const allVisibleElements = collectVisibleElements(elementMap);
		resetElementStates(elementMap);
		processActiveElement(allVisibleElements, _config.idAttribute, elementMap);
		processVisibleElementParents(allVisibleElements, _config.idAttribute, elementMap);
	}

	$effect(() => {
		if (!root) return;

		const observer = createIntersectionObserver(_config, elementMap, updateActiveElement);
		setupElementObservation(root, _config, elementMap, observer);
		const timer = setTimeout(updateActiveElement, 100);

		return () => {
			clearTimeout(timer);
			observer.disconnect();
		};
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
 * Find the elements to track within a container, honouring the id attribute,
 * an optional narrowing selector, and an optional filter.
 */
function findElements(container: HTMLElement, config: VisibilityObserverConfig): HTMLElement[] {
	const idAttribute = config.idAttribute || 'id';
	const selector = config.selector ? `[${idAttribute}]${config.selector}` : `[${idAttribute}]`;
	const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));

	if (!config.filter) return elements;

	const filter = config.filter;
	return elements.filter((element) => filter(element, element.getAttribute(idAttribute) || ''));
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
function collectVisibleElements(elementMap: SvelteMap<string, ElementEntry>): VisibleElement[] {
	const allVisibleElements: VisibleElement[] = [];

	elementMap.forEach((entry) => {
		if (entry.visible) {
			allVisibleElements.push({
				id: entry.id,
				element: entry.element,
				intersectionRatio: entry.intersectionRatio
			});
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
				element,
				visible: false,
				active: false,
				hasFocusedChildren: false,
				hasVisibleChildren: false,
				intersectionRatio: 0
			});
			observer.observe(element);
		}
	});
}

/**
 * Map internal entries to the {@link ObservedElement} shape
 */
function mapToObservedElements(elementMap: SvelteMap<string, ElementEntry>): ObservedElement[] {
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
