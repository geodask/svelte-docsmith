import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browserStars, loadBrowserStars } from './github-stars.svelte.js';

// A Map-backed localStorage, so each test starts from a known store.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
	getItem: (key: string) => store.get(key) ?? null,
	setItem: (key: string, value: string) => void store.set(key, String(value))
});

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// The store is a module singleton that asks once per repo per page load, so
// each test uses a repo of its own.
describe('loadBrowserStars', () => {
	beforeEach(() => store.clear());
	afterEach(() => vi.useRealTimers());

	it('fetches the count unauthenticated, serves it, and caches it', async () => {
		const fetch = vi.fn().mockResolvedValue(json({ stargazers_count: 42 }));
		vi.stubGlobal('fetch', fetch);
		const url = 'https://github.com/o/fetches';
		expect(browserStars(url)).toBeUndefined();
		await loadBrowserStars(url);
		expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/o/fetches', {
			headers: { accept: 'application/vnd.github+json' }
		});
		expect(browserStars(url)).toBe(42);
		expect(JSON.parse(store.get('docsmith-github-stars:o/fetches')!)).toMatchObject({ count: 42 });
	});

	it('asks once per page load, however many headers want it', async () => {
		const fetch = vi.fn().mockResolvedValue(json({ stargazers_count: 1 }));
		vi.stubGlobal('fetch', fetch);
		await Promise.all([
			loadBrowserStars('https://github.com/o/once'),
			loadBrowserStars('https://github.com/O/once/')
		]);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('serves a count cached within the day without asking', async () => {
		store.set('docsmith-github-stars:o/cached', JSON.stringify({ count: 9, at: Date.now() }));
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		await loadBrowserStars('https://github.com/o/cached');
		expect(fetch).not.toHaveBeenCalled();
		expect(browserStars('https://github.com/o/cached')).toBe(9);
	});

	it('asks again once the cached count is a day old', async () => {
		const dayAgo = Date.now() - 24 * 60 * 60 * 1000 - 1;
		store.set('docsmith-github-stars:o/stale', JSON.stringify({ count: 9, at: dayAgo }));
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ stargazers_count: 10 })));
		await loadBrowserStars('https://github.com/o/stale');
		expect(browserStars('https://github.com/o/stale')).toBe(10);
	});

	it('stays silent on a failure, and holds off retrying for an hour', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'rate limited' }, 403)));
		await expect(loadBrowserStars('https://github.com/o/limited')).resolves.toBeUndefined();
		expect(browserStars('https://github.com/o/limited')).toBeUndefined();
		const cached = JSON.parse(store.get('docsmith-github-stars:o/limited')!);
		expect(cached.count).toBeUndefined();

		// A later page load within the hour reads the failure and doesn't ask.
		store.set('docsmith-github-stars:o/limited-2', JSON.stringify({ at: Date.now() }));
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		await loadBrowserStars('https://github.com/o/limited-2');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('stays silent when the network throws', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
		await expect(loadBrowserStars('https://github.com/o/offline')).resolves.toBeUndefined();
		expect(browserStars('https://github.com/o/offline')).toBeUndefined();
	});

	it('asks nothing for a link that names no repo', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		await loadBrowserStars('https://gitlab.com/o/r');
		expect(fetch).not.toHaveBeenCalled();
	});
});
