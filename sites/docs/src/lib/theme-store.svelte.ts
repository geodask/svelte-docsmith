import { themes } from './themes-data';

// Showcase-only: applies a preset's tokens to <html> at runtime so a viewer can
// try a theme across the whole site. The library's shipped model (import one
// theme CSS at build time) is unchanged — this just writes inline custom
// properties, which win over theme.css and revert cleanly on reset.
//
// The tokens come straight from themes-data (generated from the shipped preset
// CSS), so what the picker paints is exactly what a consumer would get: the full
// set, including the sidebar/popover/ring the presets author by hand.

const STORAGE_KEY = 'docsmith-showcase-theme';
// The already-resolved `--token: value` map for the active theme+mode. The
// blocking <head> script in app.html replays this before first paint to avoid a
// theme flash on reload — no theme data is duplicated there, just this blob.
const STORAGE_VARS = 'docsmith-theme-vars';

// Every custom property any preset can set, so a reset (or a switch to a preset
// with fewer tokens) clears them all and never leaves a stale value behind.
const ALL_KEYS = [
	...new Set(themes.flatMap((t) => [...Object.keys(t.light), ...Object.keys(t.dark)]))
];

class ThemeStore {
	/** Active preset slug, or null for the site default (theme.css / Darkmatter). */
	active = $state<string | null>(null);

	/** Read the persisted choice (client only). Call once on mount. */
	init() {
		if (typeof localStorage === 'undefined') return;
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && themes.some((t) => t.slug === stored)) this.active = stored;
	}

	set(slug: string | null) {
		this.active = slug;
		if (typeof localStorage === 'undefined') return;
		if (slug) localStorage.setItem(STORAGE_KEY, slug);
		else localStorage.removeItem(STORAGE_KEY);
	}

	reset() {
		this.set(null);
	}
}

export const themeStore = new ThemeStore();

/** Write (or clear) the active theme's tokens on <html> for the current mode. */
export function applyActiveTheme(active: string | null, dark: boolean) {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;

	// Clear any previously-applied preset first, so switching themes never leaves
	// a stale property behind.
	for (const key of ALL_KEYS) root.style.removeProperty(`--${key}`);

	if (!active) {
		try {
			localStorage.removeItem(STORAGE_VARS);
		} catch {
			/* ignore */
		}
		return;
	}

	const theme = themes.find((t) => t.slug === active);
	if (!theme) return;

	const tokens = dark ? theme.dark : theme.light;
	const resolved: Record<string, string> = {};
	for (const [key, value] of Object.entries(tokens)) {
		root.style.setProperty(`--${key}`, value);
		resolved[`--${key}`] = value;
	}

	// Persist the resolved map so the pre-paint head script can replay it on reload.
	try {
		localStorage.setItem(STORAGE_VARS, JSON.stringify(resolved));
	} catch {
		/* ignore */
	}
}
