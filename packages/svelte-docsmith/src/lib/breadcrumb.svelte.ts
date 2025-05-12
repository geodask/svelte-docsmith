import type { Icon } from '@lucide/svelte';
import { getContext, setContext } from 'svelte';

export interface BreadcrumbItem {
	title?: string;
	href?: string;
	icon?: typeof Icon;
}

const key = Symbol('breadcrumb');

export function setupReactiveBreadcrumb() {
	const items: BreadcrumbItem[] = $state([]);
	return setContext(key, () => items);
}

function getBreadcrumbContext() {
	return getContext<ReturnType<typeof setupReactiveBreadcrumb>>(key);
}

export function reactiveBreadcrumb() {
	const itemsFn = getBreadcrumbContext();

	if (!itemsFn) {
		throw new Error(
			'Breadcrumb context not found. Make sure to call setupReactiveBreadcrumb in a parent component.'
		);
	}

	const items = $derived(itemsFn());

	function clear() {
		items.length = 0;
	}

	function setItems(newItems: BreadcrumbItem[]) {
		items.length = 0;
		items.push(...newItems);
	}

	return {
		get items() {
			return items;
		},
		clear,
		setItems
	};
}
