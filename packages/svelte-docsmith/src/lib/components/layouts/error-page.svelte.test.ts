import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { resolveVersions, type DocsContentItem, type SearchDoc } from '$lib/core/index.js';

// The error page mounts the whole shell, and jsdom has no SvelteKit router: a
// 404 under an archived prefix is the case that matters here.
vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/docs/v1/missing'), status: 404, error: null }
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), afterNavigate: vi.fn() }));

// The shell's theme provider pulls in mode-watcher, which reads localStorage as
// it loads; jsdom's own is incomplete here, so stub one in before the imports.
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

const config = { title: 'My Docs' };

const content: DocsContentItem[] = [
	{ title: 'Intro', path: '/docs/intro', version: 'v2' },
	{ title: 'Intro', path: '/docs/v1/intro', version: 'v1' }
];

const versions = resolveVersions(
	{ current: { id: 'v2', label: 'v2' }, archived: [{ id: 'v1', label: 'v1', noindex: true }] },
	'/docs',
	content
);

const docs: SearchDoc[] = content.map((item) => ({
	path: item.path,
	title: item.title,
	headings: [],
	text: 'install the package',
	version: item.version
}));

// The version manifest reaches the shell only if ErrorPage forwards it, so both
// of these regress together when it does not.
describe('ErrorPage on a versioned site', () => {
	afterEach(() => {
		document.head.querySelectorAll('meta[name="robots"]').forEach((n) => n.remove());
	});

	it('applies the archived version noindex to the error page', () => {
		render(ErrorPage, { props: { config, content, versions } });
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex, follow'
		);
	});

	it('scopes search to the version being read, not every archive', async () => {
		const load = vi.fn((versionId?: string) =>
			Promise.resolve(docs.filter((doc) => !versionId || doc.version === versionId))
		);
		render(ErrorPage, { props: { config, content, versions, search: load } });

		await fireEvent.keyDown(window, { key: 'k', metaKey: true });
		await vi.waitFor(() => expect(load).toHaveBeenCalledWith('v1'));
	});
});
