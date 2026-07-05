import { themes, type ThemeTokens } from './themes-data';

// Showcase-only: applies a preset's tokens to <html> at runtime so a viewer can
// try a theme across the whole site. The library's shipped model (import one
// theme CSS at build time) is unchanged — this just writes inline custom
// properties, which win over theme.css and revert cleanly on reset.

const STORAGE_KEY = 'docsmith-showcase-theme';
// The already-resolved `--token: value` map for the active theme+mode. The
// blocking <head> script in app.html replays this before first paint to avoid a
// theme flash on reload — no theme data is duplicated there, just this blob.
const STORAGE_VARS = 'docsmith-theme-vars';

// Core tokens live in themes-data; derive the rest the way the shipped CSS does,
// so applying a theme re-skins the sidebar/rings/popovers too, not just the body.
function fullTokenSet(core: ThemeTokens): ThemeTokens {
	return {
		...core,
		ring: core.primary,
		input: core.border,
		popover: core.card,
		'popover-foreground': core['card-foreground'],
		sidebar: core.background,
		'sidebar-foreground': core.foreground,
		'sidebar-primary': core.primary,
		'sidebar-primary-foreground': core['primary-foreground'],
		'sidebar-accent': core.accent,
		'sidebar-accent-foreground': core['accent-foreground'],
		'sidebar-border': core.border,
		'sidebar-ring': core.primary
	};
}

const ALL_KEYS = Object.keys(fullTokenSet(themes[0].light));

class ThemeStore {
	/** Active preset slug, or null for the site default (theme.css / Tangerine). */
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
	if (!active) {
		for (const key of ALL_KEYS) root.style.removeProperty(`--${key}`);
		try {
			localStorage.removeItem(STORAGE_VARS);
		} catch {
			/* ignore */
		}
		return;
	}
	const theme = themes.find((t) => t.slug === active);
	if (!theme) return;
	const tokens = fullTokenSet(dark ? theme.dark : theme.light);
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
