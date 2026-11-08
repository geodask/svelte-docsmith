import { BROWSER } from 'esm-env';
import { githubRepo } from '#lib/core/github-stars.js';

// The header's fallback for a star count the build couldn't get. Every reader
// has their own unauthenticated allowance (60 requests an hour per IP), so one
// request per reader, cached in localStorage for a day, never runs it out,
// where one shared build machine often has.
//
// The store is a module singleton so the desktop header and the mobile bar
// share one request. It is only written on the client, after hydration, so
// the server and the first client render agree on "no count".

const PREFIX = 'docsmith-github-stars:';
const API = 'https://api.github.com/repos';
// A count is good for a day; a failure is retried after an hour, so a reader
// who hit the limit isn't charged a request on every page load.
const COUNT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FAILURE_MAX_AGE_MS = 60 * 60 * 1000;

const counts = $state<Record<string, number>>({});
// Bookkeeping only: nothing renders from it, so it needs no reactivity.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const requested = new Set<string>();

type Cached = { count?: number; at: number };

const keyOf = (url: string) => {
	const repo = githubRepo(url);
	return repo ? `${repo.owner}/${repo.repo}`.toLowerCase() : undefined;
};

/** The count fetched in this browser for a GitHub URL, once it has arrived. */
export function browserStars(url: string): number | undefined {
	const key = keyOf(url);
	return key ? counts[key] : undefined;
}

function readCache(key: string): Cached | undefined {
	try {
		const cached = JSON.parse(localStorage.getItem(PREFIX + key) ?? 'null') as Cached | null;
		if (!cached || typeof cached.at !== 'number') return undefined;
		const fresh =
			typeof cached.count === 'number'
				? Date.now() - cached.at < COUNT_MAX_AGE_MS
				: Date.now() - cached.at < FAILURE_MAX_AGE_MS;
		return fresh ? cached : undefined;
	} catch {
		return undefined;
	}
}

function writeCache(key: string, cached: Cached) {
	try {
		localStorage.setItem(PREFIX + key, JSON.stringify(cached));
	} catch {
		// Storage unavailable (private mode, quota): the count holds for this
		// page view only, and the next load asks again.
	}
}

/**
 * Fetch the star count for a GitHub URL in the reader's browser, once per page
 * load and at most once a day per reader. Client-only, and silent on every
 * failure: the header then shows the bare link, as it does today.
 */
export async function loadBrowserStars(url: string): Promise<void> {
	const key = keyOf(url);
	if (!BROWSER || !key || requested.has(key)) return;
	requested.add(key);

	const cached = readCache(key);
	if (cached) {
		if (cached.count !== undefined) counts[key] = cached.count;
		return;
	}

	let count: number | undefined;
	try {
		const response = await fetch(`${API}/${key}`, {
			headers: { accept: 'application/vnd.github+json' }
		});
		if (response.ok) {
			const stars = ((await response.json()) as { stargazers_count?: unknown }).stargazers_count;
			if (typeof stars === 'number' && Number.isFinite(stars)) count = stars;
		}
	} catch {
		// Offline, blocked by an extension or CSP: no count.
	}
	writeCache(key, { count, at: Date.now() });
	if (count !== undefined) counts[key] = count;
}
