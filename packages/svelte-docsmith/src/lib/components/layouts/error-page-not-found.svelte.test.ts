import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';

// Navigation the test drives by hand: the page the router is on, and the
// `afterNavigate` callbacks mounted components registered.
const nav = vi.hoisted(() => ({
	page: { url: new URL('http://localhost/docs/missing'), status: 404, error: null },
	callbacks: [] as Array<(navigation: { from: { url: URL } | null }) => void>
}));
vi.mock('$app/state', () => ({
	get page() {
		return nav.page;
	}
}));
vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	afterNavigate: (callback: (typeof nav.callbacks)[number]) => nav.callbacks.push(callback)
}));
vi.mock('svelte-docsmith/site', () => ({
	site: { title: 'My Docs' },
	outside: [],
	githubStars: undefined
}));
const handler = vi.hoisted(() => vi.fn());
vi.mock('svelte-docsmith/reader-events', () => ({ handler }));

// mode-watcher reads localStorage as it loads; jsdom's own is incomplete here.
vi.hoisted(() => {
	const map = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		get length() {
			return map.size;
		},
		clear: () => map.clear(),
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => void map.set(key, String(value)),
		removeItem: (key: string) => void map.delete(key),
		key: (index: number) => [...map.keys()][index] ?? null
	} satisfies Storage);
});

import ErrorPage from './error-page.svelte';

function navigate(to: string, from: string | null) {
	nav.page = { ...nav.page, url: new URL(to, 'http://localhost') };
	const navigation = { from: from ? { url: new URL(from, 'http://localhost') } : null };
	for (const callback of nav.callbacks) callback(navigation);
}

beforeEach(() => {
	nav.callbacks = [];
	nav.page = { url: new URL('http://localhost/docs/missing'), status: 404, error: null };
});

describe('ErrorPage not_found events', () => {
	it('reports landing on a missing page, with the referrer the browser gives', () => {
		vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://blog.example/post');
		render(ErrorPage, { props: { content: [] } });
		navigate('/docs/missing', null);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith({
			type: 'not_found',
			path: '/docs/missing',
			referrer: 'https://blog.example/post'
		});
	});

	it('reports each missing page navigated to, from the page the reader was on', () => {
		vi.spyOn(document, 'referrer', 'get').mockReturnValue('');
		render(ErrorPage, { props: { content: [] } });
		navigate('/docs/missing', null);
		navigate('/docs/also-missing', 'http://localhost/docs/missing');
		expect(handler.mock.calls.map(([event]) => event)).toEqual([
			{ type: 'not_found', path: '/docs/missing', referrer: null },
			{
				type: 'not_found',
				path: '/docs/also-missing',
				referrer: 'http://localhost/docs/missing'
			}
		]);
	});

	it('reports nothing for other errors', () => {
		nav.page = { ...nav.page, status: 500 };
		render(ErrorPage, { props: { content: [] } });
		navigate('/docs/broken', null);
		expect(handler).not.toHaveBeenCalled();
	});
});
