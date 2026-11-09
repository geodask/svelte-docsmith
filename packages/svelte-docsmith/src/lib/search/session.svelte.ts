/**
 * The search session: everything the ⌘K palette knows apart from how it looks.
 *
 * `DocsShell` creates one and publishes it on context. The header triggers flip
 * `open`; the dialog binds `open` and `query` and renders `status`, `results`
 * and `suggestions`. The rules about *what* to show live here: when the index
 * loads, which version it is for, when it is rebuilt, what the empty state
 * suggests. That keeps them testable with a fake loader and no DOM.
 */
import { getContext, setContext, untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { SearchDoc } from '#lib/core/content.js';
import { scopeContent } from '#lib/core/version.js';
import type { SearchEngine, SearchResult } from './create-search.js';

/**
 * Provides the generated search records. Receives the active version id on a
 * versioned site, so it may return just that version's records; results are
 * scoped either way.
 */
export type SearchLoader = (versionId?: string) => Promise<SearchDoc[]>;

export type SearchStatus = 'idle' | 'loading' | 'error';

export type SearchSessionOptions = {
	load: SearchLoader;
	/**
	 * The version being read, or `undefined` on an unversioned site. A getter so
	 * the session follows the reader across a version switch.
	 */
	version?: () => string | undefined;
	/**
	 * Called once each time the palette closes after the reader typed a query:
	 * with the page they picked, or `null` when they closed without one. Never
	 * for a query left empty, or before the index was ready to answer it.
	 */
	onsearch?: (search: FinishedSearch) => void;
};

/** One search the reader finished: what they last typed, and how it ended. */
export type FinishedSearch = {
	query: string;
	results: number;
	picked: string | null;
};

/** One version's records and the engine over them. */
type VersionIndex = { docs: SearchDoc[]; engine: SearchEngine };

/** How many starter pages the empty state offers. */
const SUGGESTION_COUNT = 4;
/** Common first pages, preferred in this order when the site has them. */
const STARTER_PAGES = [/introduction/i, /quick[- ]?start/i, /install/i, /getting started/i];

export class SearchSession {
	query = $state('');

	#open = $state(false);
	readonly #onsearch: ((search: FinishedSearch) => void) | undefined;

	#status = $state<SearchStatus>('idle');
	// One index per version the reader has searched, so switching back to a
	// version already built is instant. Keyed by version id (`undefined` on an
	// unversioned site).
	readonly #indexes = new SvelteMap<string | undefined, VersionIndex>();
	// The load in flight, so a second request for the same version waits on it
	// and a load that finishes after the reader switched versions is dropped.
	#pending: { version: string | undefined } | null = null;

	readonly #load: SearchLoader;
	readonly #version: () => string | undefined;

	constructor({ load, version = () => undefined, onsearch }: SearchSessionOptions) {
		this.#load = load;
		this.#version = version;
		this.#onsearch = onsearch;

		// Build the index the first time the palette opens, keep it across opens,
		// and build the next version's when the reader switches while open. Only
		// `open` and the version are tracked: reacting to `status` too would turn
		// a failing loader into a retry loop.
		$effect(() => {
			if (!this.open) return;
			const active = this.#version();
			untrack(() => this.#loadIndexFor(active));
		});
	}

	/**
	 * Whether the palette is open. Closing it here (the dialog's binding, the
	 * keyboard shortcut) finishes the search without a pick.
	 */
	get open(): boolean {
		return this.#open;
	}

	set open(value: boolean) {
		if (this.#open && !value) this.#finish(null);
		this.#open = value;
	}

	/** Whether the index is loading, failed to load, or ready (`idle`). */
	get status(): SearchStatus {
		return this.#status;
	}

	// The version being read's index, if built: until then nothing shows, never
	// another version's pages.
	readonly #current: VersionIndex | undefined = $derived.by(() =>
		this.#indexes.get(this.#version())
	);

	/** The query without surrounding whitespace; empty means show starter pages. */
	readonly trimmedQuery: string = $derived.by(() => this.query.trim());

	/** Ranked results for the query, from the version being read. */
	readonly results: SearchResult[] = $derived.by(() => {
		const index = this.#current;
		if (!index || !this.trimmedQuery) return [];
		return index.engine.search(this.trimmedQuery);
	});

	/**
	 * Starter pages for the empty state, from the version being read: common first
	 * pages when the site has them, then the rest of the index in order, so a site
	 * with custom page names still gets something.
	 */
	readonly suggestions: SearchDoc[] = $derived.by(() => {
		const scoped = this.#current?.docs ?? [];
		const picked: SearchDoc[] = [];
		for (const pattern of STARTER_PAGES) {
			const hit = scoped.find(
				(doc) =>
					!picked.includes(doc) &&
					(pattern.test(doc.title) || pattern.test(doc.path) || pattern.test(doc.section ?? ''))
			);
			if (hit) picked.push(hit);
		}
		for (const doc of scoped) {
			if (picked.length >= SUGGESTION_COUNT) break;
			if (!picked.includes(doc)) picked.push(doc);
		}
		return picked.slice(0, SUGGESTION_COUNT);
	});

	/**
	 * Close after the reader picks a page, clearing the query for next time.
	 * `path` is the page they picked, which finishes the search with it.
	 */
	select(path?: string): void {
		if (this.#open) this.#finish(path ?? null);
		this.#open = false;
		this.query = '';
	}

	// Report the search the palette is closing on. A results count from an
	// index that isn't built yet would read as "nothing found", so a search
	// closed while loading (or after a failed load) goes unreported.
	#finish(picked: string | null): void {
		const query = untrack(() => this.trimmedQuery);
		if (!query || !this.#onsearch || !untrack(() => this.#current)) return;
		const results = untrack(() => this.results.length);
		this.#onsearch({ query, results, picked });
	}

	async #loadIndexFor(version: string | undefined): Promise<void> {
		if (this.#indexes.has(version)) {
			// Already built (say, after switching away and back): abandon any other
			// version's load and its loading or error state.
			this.#pending = null;
			this.#status = 'idle';
			return;
		}
		if (this.#pending && this.#pending.version === version) return;

		const request = { version };
		this.#pending = request;
		this.#status = 'loading';
		try {
			// The engine (and FlexSearch with it) is code-split alongside the index.
			const [{ createSearchEngine }, docs] = await Promise.all([
				import('./create-search.js'),
				this.#load(version)
			]);
			if (this.#pending !== request) return;
			// Scope once, here, so results and suggestions can't disagree about the
			// version, and a loader that returns every version still yields one
			// version's index.
			const scoped = scopeContent(docs, version);
			this.#indexes.set(version, { docs: scoped, engine: createSearchEngine(scoped) });
			this.#status = 'idle';
		} catch (error) {
			if (this.#pending !== request) return;
			console.error('[svelte-docsmith] failed to load the search index', error);
			this.#status = 'error';
		} finally {
			if (this.#pending === request) this.#pending = null;
		}
	}
}

const KEY = Symbol('docsmith-search');

/**
 * Create the search session and publish it on context, so the header triggers
 * and the single dialog share it. Call during `DocsShell` init.
 */
export function createSearchSession(options: SearchSessionOptions): SearchSession {
	const session = new SearchSession(options);
	setContext(KEY, session);
	return session;
}

/** Read the search session, or `undefined` when search is not enabled. */
export function useSearchSession(): SearchSession | undefined {
	return getContext<SearchSession>(KEY);
}
