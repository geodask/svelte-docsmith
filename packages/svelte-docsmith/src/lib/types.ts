import type { Snippet } from 'svelte';

/**
 * Adds a required `children` snippet to a props type.
 */
export type WithChildren<T> = T & {
	children: Snippet;
};
