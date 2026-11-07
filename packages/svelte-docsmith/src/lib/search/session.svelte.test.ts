import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { SearchDoc } from '#lib/core/index.js';
import { SearchSession, type SearchLoader } from './session.svelte.js';

const doc = (path: string, title: string, version?: string, text = ''): SearchDoc => ({
	path,
	title,
	headings: [],
	text: text || `${title} page`,
	version
});

// Two versions of the same site: the current v2 and an archived v1. Each has a
// page about routing, so a query for it shows which version answered.
const docs: SearchDoc[] = [
	doc('/docs/introduction', 'Introduction', 'v2'),
	doc('/docs/routing', 'Routing', 'v2', 'Route handlers in v2'),
	doc('/docs/v1/introduction', 'Introduction v1', 'v1'),
	doc('/docs/v1/routing', 'Routing v1', 'v1', 'Route handlers in v1')
];

// A loader that returns only the requested version's records, like a site that
// splits its index per version. With no id it returns everything.
const perVersion = (records = docs): SearchLoader =>
	vi.fn((versionId?: string) =>
		Promise.resolve(records.filter((d) => !versionId || d.version === versionId))
	);

/** A promise the test settles by hand, to hold a load in flight. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

let cleanups: Array<() => void> = [];
afterEach(() => {
	cleanups.forEach((cleanup) => cleanup());
	cleanups = [];
	vi.restoreAllMocks();
});

/**
 * A session the way DocsShell makes one, reading the version off reactive
 * state the test can switch. Built inside an effect root, since the session
 * watches `open` and the version with an effect.
 */
function setup(load: SearchLoader, initialVersion?: string) {
	const reader = $state({ version: initialVersion });
	let session!: SearchSession;
	cleanups.push(
		$effect.root(() => {
			session = new SearchSession({ load, version: () => reader.version });
		})
	);
	return {
		session,
		open() {
			session.open = true;
			flushSync();
		},
		close() {
			session.open = false;
			flushSync();
		},
		switchTo(version: string | undefined) {
			reader.version = version;
			flushSync();
		},
		/** Wait for the load in flight to finish, whichever way it ends. */
		settled: () => vi.waitFor(() => expect(session.status).not.toBe('loading'))
	};
}

const paths = (items: Array<{ path: string }>) => items.map((item) => item.path);

describe('SearchSession loading', () => {
	it('loads nothing until the palette first opens', () => {
		const load = perVersion();
		const { session } = setup(load);
		flushSync();

		expect(load).not.toHaveBeenCalled();
		expect(session.status).toBe('idle');
		expect(session.suggestions).toEqual([]);
	});

	it('loads once, shows loading while it does, and keeps the index across opens', async () => {
		const load = perVersion();
		const s = setup(load);

		s.open();
		expect(s.session.status).toBe('loading');
		await s.settled();
		expect(s.session.status).toBe('idle');

		s.close();
		s.open();
		expect(s.session.status).toBe('idle');
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('reports a failed load, does not retry while open, and retries on the next open', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const load = vi
			.fn<SearchLoader>()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue(docs);
		const s = setup(load);

		s.open();
		await s.settled();
		expect(s.session.status).toBe('error');

		// Give a retry loop the chance to show itself: there must not be one.
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(load).toHaveBeenCalledTimes(1);

		s.close();
		s.open();
		await s.settled();
		expect(s.session.status).toBe('idle');
		expect(load).toHaveBeenCalledTimes(2);
	});
});

describe('SearchSession results', () => {
	it('ranks results for the query and returns none for a blank one', async () => {
		const records = [doc('/docs/a', 'Alpha'), doc('/docs/b', 'Theming', undefined, 'tokens')];
		const s = setup(perVersion(records));

		s.open();
		await s.settled();
		s.session.query = 'theming';
		expect(paths(s.session.results)).toEqual(['/docs/b']);

		s.session.query = '   ';
		expect(s.session.results).toEqual([]);
	});

	it('closes and clears the query once a page is picked', async () => {
		const s = setup(perVersion());
		s.open();
		await s.settled();
		s.session.query = 'routing';

		s.session.select();
		expect(s.session.open).toBe(false);
		expect(s.session.query).toBe('');
	});
});

describe('SearchSession version scoping', () => {
	it('stays unscoped on an unversioned site: the loader gets no id', async () => {
		const unversioned = docs.map((d) => ({ ...d, version: undefined }));
		const load = perVersion(unversioned);
		const s = setup(load);

		s.open();
		await s.settled();
		s.session.query = 'routing';

		expect(load).toHaveBeenCalledWith(undefined);
		expect(paths(s.session.results).sort()).toEqual(['/docs/routing', '/docs/v1/routing']);
	});

	it('asks the loader for the version being read', async () => {
		const load = perVersion();
		const s = setup(load, 'v1');

		s.open();
		await s.settled();

		expect(load).toHaveBeenCalledWith('v1');
	});

	it('scopes results and suggestions even when the loader returns every version', async () => {
		// The default `svelte-docsmith/search` export ignores the id and returns
		// all versions' records; the session still shows only the one being read.
		const load = vi.fn(() => Promise.resolve(docs));
		const s = setup(load, 'v1');

		s.open();
		await s.settled();

		s.session.query = 'routing';
		expect(paths(s.session.results)).toEqual(['/docs/v1/routing']);
		expect(paths(s.session.suggestions).sort()).toEqual([
			'/docs/v1/introduction',
			'/docs/v1/routing'
		]);
	});

	it('rebuilds for the new version when the reader switches while open', async () => {
		const load = perVersion();
		const s = setup(load, 'v2');
		s.open();
		await s.settled();
		s.session.query = 'routing';
		expect(paths(s.session.results)).toEqual(['/docs/routing']);

		s.switchTo('v1');
		// Never another version's pages, not even while the new index loads.
		expect(s.session.status).toBe('loading');
		expect(s.session.results).toEqual([]);
		expect(s.session.suggestions).toEqual([]);

		await s.settled();
		expect(load).toHaveBeenLastCalledWith('v1');
		expect(paths(s.session.results)).toEqual(['/docs/v1/routing']);
	});

	it('waits for the next open to load a version switched to while closed', async () => {
		const load = perVersion();
		const s = setup(load, 'v2');
		s.open();
		await s.settled();
		s.close();

		s.switchTo('v1');
		expect(load).toHaveBeenCalledTimes(1);

		s.open();
		await s.settled();
		expect(load).toHaveBeenCalledTimes(2);
		expect(load).toHaveBeenLastCalledWith('v1');
	});

	it('drops a load that finishes after the reader moved to another version', async () => {
		const pending = { v1: deferred<SearchDoc[]>(), v2: deferred<SearchDoc[]>() };
		const load = vi.fn((versionId?: string) => pending[versionId as 'v1' | 'v2'].promise);
		const s = setup(load, 'v2');

		s.open();
		s.switchTo('v1');
		expect(load.mock.calls).toEqual([['v2'], ['v1']]);

		// v1 lands first, then the stale v2 load; v2 must not overwrite it.
		pending.v1.resolve(docs.filter((d) => d.version === 'v1'));
		await s.settled();
		pending.v2.resolve(docs.filter((d) => d.version === 'v2'));
		await new Promise((resolve) => setTimeout(resolve, 0));
		flushSync();

		s.session.query = 'routing';
		expect(paths(s.session.results)).toEqual(['/docs/v1/routing']);
		expect(s.session.status).toBe('idle');
	});

	it('does not load the same version twice while that load is in flight', async () => {
		const pending = deferred<SearchDoc[]>();
		const load = vi.fn(() => pending.promise);
		const s = setup(load, 'v2');

		s.open();
		s.close();
		s.open();
		expect(load).toHaveBeenCalledTimes(1);

		pending.resolve(docs);
		await s.settled();
		expect(s.session.status).toBe('idle');
	});
});

describe('SearchSession suggestions', () => {
	it('prefers common first pages, then fills from the index up to four', async () => {
		const records = [
			doc('/docs/theming', 'Theming'),
			doc('/docs/components', 'Components'),
			doc('/docs/install', 'Installation'),
			doc('/docs/api', 'API'),
			doc('/docs/introduction', 'Introduction'),
			doc('/docs/faq', 'FAQ')
		];
		const s = setup(perVersion(records));

		s.open();
		await s.settled();

		expect(paths(s.session.suggestions)).toEqual([
			'/docs/introduction',
			'/docs/install',
			'/docs/theming',
			'/docs/components'
		]);
	});
});
