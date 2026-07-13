import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncedValue, setSyncedValue, hydrateSyncedValue } from './tabs-sync.svelte.js';

// A minimal in-memory Storage; jsdom's own localStorage is incomplete here.
function createStorage(): Storage {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		clear: () => map.clear(),
		getItem: (key) => (map.has(key) ? map.get(key)! : null),
		setItem: (key, value) => void map.set(key, String(value)),
		removeItem: (key) => void map.delete(key),
		key: (index) => [...map.keys()][index] ?? null
	};
}

// Uses a unique key per test because the store is a module singleton that
// persists across cases within this file.
describe('tabs sync store', () => {
	beforeEach(() => vi.stubGlobal('localStorage', createStorage()));
	afterEach(() => vi.unstubAllGlobals());

	it('returns undefined for an unset key', () => {
		expect(syncedValue('grp-unset')).toBeUndefined();
	});

	it('records a selection in memory and persists it', () => {
		setSyncedValue('grp-set', 'pnpm');
		expect(syncedValue('grp-set')).toBe('pnpm');
		expect(localStorage.getItem('docsmith-tabs:grp-set')).toBe('pnpm');
	});

	it('ignores a no-op write of the current value', () => {
		setSyncedValue('grp-noop', 'npm');
		expect(() => setSyncedValue('grp-noop', 'npm')).not.toThrow();
		expect(syncedValue('grp-noop')).toBe('npm');
	});

	it('hydrates a persisted selection from localStorage', () => {
		localStorage.setItem('docsmith-tabs:grp-hydrate', 'yarn');
		expect(syncedValue('grp-hydrate')).toBeUndefined();
		hydrateSyncedValue('grp-hydrate');
		expect(syncedValue('grp-hydrate')).toBe('yarn');
	});

	it('does not let a stale stored value overwrite an in-memory choice', () => {
		setSyncedValue('grp-fresh', 'pnpm');
		localStorage.setItem('docsmith-tabs:grp-fresh', 'npm'); // stale on disk
		hydrateSyncedValue('grp-fresh');
		expect(syncedValue('grp-fresh')).toBe('pnpm');
	});

	it('keeps sync in memory when persistence throws', () => {
		vi.stubGlobal('localStorage', {
			...createStorage(),
			setItem: () => {
				throw new Error('quota');
			}
		});
		expect(() => setSyncedValue('grp-throw', 'pnpm')).not.toThrow();
		expect(syncedValue('grp-throw')).toBe('pnpm');
	});
});
