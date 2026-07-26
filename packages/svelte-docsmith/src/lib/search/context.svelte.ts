/**
 * Shared open-state for the search palette. `DocsShell` creates it once; the
 * header/mobile-header triggers and the single `<Search>` dialog read it through
 * context, so one keyboard shortcut and one dialog serve every trigger.
 */
import { getContext, setContext } from 'svelte';

const KEY = Symbol('docsmith-search');

export class SearchState {
	open = $state(false);
}

/** Create the search state and publish it on context. Call in `DocsShell`. */
export function createSearchState(): SearchState {
	const state = new SearchState();
	setContext(KEY, state);
	return state;
}

/** Read the search state, or `undefined` when search is not enabled. */
export function useSearch(): SearchState | undefined {
	return getContext<SearchState>(KEY);
}
