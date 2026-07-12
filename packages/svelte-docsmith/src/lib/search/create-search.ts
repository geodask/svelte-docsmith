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
};

export type SearchEngine = {
	/** Ranked results for `query`, at most `limit` (default 8). */
	search(query: string, limit?: number): SearchResult[];
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
		search(query, limit = 8) {
			const trimmed = query.trim();
			if (!trimmed) return [];

			// `merge: true` returns unified, unique ids ranked across fields.
			const hits = index.search(trimmed, { limit, merge: true }) as Array<{ id: number }>;
			const results: SearchResult[] = [];

			for (const { id } of hits) {
				const doc = docs[id];
				if (!doc) continue;
				results.push({
					path: doc.path,
					title: doc.title,
					section: doc.section,
					snippet: buildSnippet(doc.text || doc.description || '', trimmed)
				});
			}

			return results;
		}
	};
}
