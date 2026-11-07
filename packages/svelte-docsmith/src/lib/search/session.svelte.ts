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
};

/** The engine for one version, over that version's records only. */
type Index = { version: string | undefined; docs: SearchDoc[]; engine: SearchEngine };

/** How many starter pages the empty state offers. */
const SUGGESTION_COUNT = 4;
/** Common first pages, preferred in this order when the site has them. */
const STARTER_PAGES = [/introduction/i, /quick[- ]?start/i, /install/i, /getting started/i];

export class SearchSession {
	open = $state(false);
	query = $state('');

	#status = $state<SearchStatus>('idle');
	#index = $state.raw<Index | null>(null);
	// The load in flight, so a second request for the same version waits on it
	// and a load that finishes after the reader switched versions is dropped.
	#pending: { version: string | undefined } | null = null;

	readonly #load: SearchLoader;
	readonly #version: () => string | undefined;

	constructor({ load, version = () => undefined }: SearchSessionOptions) {
		this.#load = load;
		this.#version = version;

		// Build the index the first time the palette opens, keep it across opens,
		// and rebuild it when the reader switches versions while it is open. Only
		// `open` and the version are tracked: reacting to `status` too would turn
		// a failing loader into a retry loop.
		$effect(() => {
			if (!this.open) return;
			const active = this.#version();
			untrack(() => this.#ensure(active));
		});
	}

	/** Whether the index is loading, failed to load, or ready (`idle`). */
	get status(): SearchStatus {
		return this.#status;
	}

	// The index, only while it is for the version being read: after a version
	// switch the old one shows nothing rather than another version's pages.
	readonly #current: Index | null = $derived.by(() =>
		this.#index?.version === this.#version() ? this.#index : null
	);

	/** Ranked results for the query, from the version being read. */
	readonly results: SearchResult[] = $derived.by(() => {
		const index = this.#current;
		if (!index || !this.query.trim()) return [];
		return index.engine.search(this.query);
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

	/** Close after the reader picks a page, clearing the query for next time. */
	select(): void {
		this.open = false;
		this.query = '';
	}

	async #ensure(version: string | undefined): Promise<void> {
		if (this.#index && this.#index.version === version) {
			// Back on the version already built (say, after switching away and
			// back): abandon any other version's load and its loading or error state.
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
			this.#index = { version, docs: scoped, engine: createSearchEngine(scoped) };
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
export function useSearch(): SearchSession | undefined {
	return getContext<SearchSession>(KEY);
}
