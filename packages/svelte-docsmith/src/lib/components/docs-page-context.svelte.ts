/**
 * The resolved page view, on context.
 *
 * `core/docs-page.ts` decides what the page is; this is the single route that
 * decision travels to the chrome. Publishing it once is what keeps the headers
 * from taking props described in terms of their grandchildren, and the search
 * scope from being pushed into shared mutable state by an effect.
 *
 * Sits beside the components rather than in `core/`, which stays free of any
 * Svelte runtime import.
 */
import { getContext, setContext } from 'svelte';
import type { DocsPageView } from '$lib/core/index.js';

const KEY = Symbol('docsmith-page');

/**
 * Publish the page view. `DocsShell` calls this once, with a getter rather than
 * a value, so readers see the current `$derived` rather than the one that
 * existed at init.
 */
export function setDocsPage(view: () => DocsPageView): void {
	setContext(KEY, view);
}

/**
 * Read the page view. Returns the getter: call it where the value is used
 * (markup, or a `$derived`) so the read stays reactive.
 *
 * Throws outside `DocsShell`. Every caller is internal chrome the shell renders
 * itself, so an absent context is a wiring bug, not a supported mode.
 */
export function useDocsPage(): () => DocsPageView {
	const view = getContext<(() => DocsPageView) | undefined>(KEY);
	if (!view) {
		throw new Error('[svelte-docsmith] this component must be rendered inside <DocsShell>.');
	}
	return view;
}
