import { BROWSER } from 'esm-env';

// Cross-instance tab sync. Every <Tabs syncKey="x"> reads and writes the same
// entry here, so choosing "pnpm" in one code block selects it in every block
// with that key, and the choice survives reloads and navigation.
//
// The store is a module singleton. It is only ever written on the client (all
// writers below are BROWSER-guarded), so on the server it stays empty and each
// request falls back to the default tab — no cross-request state leakage.

const PREFIX = 'docsmith-tabs:';

const selections = $state<Record<string, string>>({});

let listening = false;
function listenForOtherWindows() {
	if (listening || !BROWSER) return;
	listening = true;
	// Mirror choices made in other tabs/windows of the same site.
	window.addEventListener('storage', (event) => {
		if (event.key?.startsWith(PREFIX) && event.newValue !== null) {
			selections[event.key.slice(PREFIX.length)] = event.newValue;
		}
	});
}

/** The current selection for a sync key, or `undefined` if none is stored. */
export function syncedValue(key: string): string | undefined {
	return selections[key];
}

/** Record a selection for a sync key and persist it. Client-only. */
export function setSyncedValue(key: string, value: string): void {
	if (!BROWSER || selections[key] === value) return;
	selections[key] = value;
	try {
		localStorage.setItem(PREFIX + key, value);
	} catch {
		// Storage can be unavailable (private mode, quota); sync stays in-memory
		// for this session rather than throwing.
	}
}

/**
 * Load a key's persisted selection into the reactive store, once, on the
 * client. Called from an effect (after hydration) so the first client render
 * still matches the server's default and there is no hydration mismatch.
 */
export function hydrateSyncedValue(key: string): void {
	if (!BROWSER) return;
	listenForOtherWindows();
	if (key in selections) return;
	try {
		const stored = localStorage.getItem(PREFIX + key);
		if (stored !== null) selections[key] = stored;
	} catch {
		// ignore unreadable storage
	}
}
