/**
 * The client-side search engine. Builds a FlexSearch document index over the
 * generated `svelte-docsmith/search` records (title, headings, description, and
 * plain-text body) and returns a `search()` that maps hits back to page links
 * with a context snippet. Framework-agnostic on purpose so it can be unit-tested
 * without a DOM; the `<Search>` component lazy-loads both this and the index.
 */
import { Document } from 'flexsearch';
import type { SearchDoc } from '$lib/core/content.js';
import { buildSnippet } from './snippet.js';

/** One result row: enough to render a link and a preview. */
export type SearchResult = {
	path: string;
	title: string;
	section?: string;
	snippet: string;
	/** The page's version id, so a versioned site can scope results. */
	version?: string;
};

export type SearchEngine = {
	/**
	 * Ranked results for `query`, at most `limit` (default 8). Pass `version` to
	 * return only that version's pages (over-fetches internally so the limit is
	 * still met after filtering).
	 */
	search(query: string, limit?: number, version?: string): SearchResult[];
};

type IndexedDoc = {
	id: number;
	title: string;
	headings: string;
	description: string;
	text: string;
};

/** Build a search engine over `docs`. Indexing is synchronous and one-time. */
export function createSearchEngine(docs: SearchDoc[]): SearchEngine {
	const index = new Document<IndexedDoc>({
		tokenize: 'forward',
		document: {
			id: 'id',
			// Title and headings first so their matches outrank body matches.
			index: [
				{ field: 'title' },
				{ field: 'headings' },
				{ field: 'description' },
				{ field: 'text' }
			]
		}
	});

	docs.forEach((doc, id) => {
		index.add({
			id,
			title: doc.title,
			headings: doc.headings.join(' '),
			description: doc.description ?? '',
			text: doc.text
		});
	});

	return {
		search(query, limit = 8, version) {
			const trimmed = query.trim();
			if (!trimmed) return [];

			// When scoping to a version, over-fetch so the limit still holds after
			// filtering out the other versions' hits.
			const fetch = version ? limit * 5 : limit;
			// `merge: true` returns unified, unique ids ranked across fields.
			const hits = index.search(trimmed, { limit: fetch, merge: true }) as Array<{ id: number }>;
			const results: SearchResult[] = [];

			for (const { id } of hits) {
				const doc = docs[id];
				if (!doc) continue;
				if (version && doc.version !== version) continue;
				results.push({
					path: doc.path,
					title: doc.title,
					section: doc.section,
					snippet: buildSnippet(doc.text || doc.description || '', trimmed),
					version: doc.version
				});
				if (results.length >= limit) break;
			}

			return results;
		}
	};
}
