/**
 * The resolved page view, on context.
 *
 * `core/docs-page.ts` decides what the page is; this is the single route that
 * decision travels to the chrome. Publishing it once is what keeps the headers
 * from taking props described in terms of their grandchildren, and the search
 * scope from being pushed into shared mutable state by an effect.
 *
 * Sits at the root of `components/` rather than in a concern folder of its own:
 * `core/` stays free of any Svelte import, and both `layouts/` and `chrome/`
 * read this, so it can't live in either without one importing the other.
 */
import { getContext, setContext } from 'svelte';
import type { DocsPageView } from '$lib/core/index.js';

const KEY = Symbol('docsmith-page');

/** A live read of the page view: `view` re-reads the shell's `$derived`. */
export type DocsPageContext = {
	readonly view: DocsPageView;
};

/**
 * Publish the page view. `DocsShell` calls this once, with a getter rather than
 * a value, so readers see the current `$derived` rather than the one that
 * existed at init.
 */
export function setDocsPage(view: () => DocsPageView): void {
	setContext(KEY, view);
}

/**
 * Read the page view. `getContext` only works during init, so this hands back
 * an accessor rather than a snapshot: hold it at init, read `.view` where the
 * value is used, and the read stays reactive.
 *
 * Throws outside `DocsShell`. Every caller is internal chrome the shell renders
 * itself, so an absent context is a wiring bug, not a supported mode.
 */
export function useDocsPage(): DocsPageContext {
	const get = getContext<(() => DocsPageView) | undefined>(KEY);
	if (!get) {
		throw new Error('[svelte-docsmith] this component must be rendered inside <DocsShell>.');
	}
	return {
		get view() {
			return get();
		}
	};
}
