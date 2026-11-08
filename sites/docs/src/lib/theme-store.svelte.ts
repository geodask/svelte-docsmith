import { themes } from './themes-data';

// Docs-site only: paints a theme's tokens on <html> at runtime so a reader can
// try it across the whole site. The library's model (docsmith({ theme }) at
// build time) is unchanged; this writes inline custom properties, which win
// over the served theme and revert cleanly on reset.
//
// Two sources: a preset picked on /docs/theming (`active`), or a theme the
// builder applied (`custom`). The builder's tokens win while set.

export type AppliedTokens = { light: Record<string, string>; dark: Record<string, string> };

const STORAGE_KEY = 'docsmith-showcase-theme';
const STORAGE_CUSTOM = 'docsmith-builder-theme';
// The already-resolved `--token: value` map for the active theme and mode. The
// blocking <head> script in app.html replays it before first paint, so a
// reload doesn't flash the default theme.
const STORAGE_VARS = 'docsmith-theme-vars';

// Every custom property a preset can set, so switching never leaves a stale one.
const PRESET_KEYS = [
	...new Set(themes.flatMap((t) => [...Object.keys(t.light), ...Object.keys(t.dark)]))
];
let appliedKeys: string[] = [];

function read<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

function write(key: string, value: unknown) {
	try {
		if (value == null) localStorage.removeItem(key);
		else localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
	} catch {
		/* storage may be unavailable */
	}
}

class ThemeStore {
	/** A preset slug picked on the theming page, or null for the site's own theme. */
	active = $state<string | null>(null);

	/** A theme applied from the builder, which wins over `active` while set. */
	custom = $state<AppliedTokens | null>(null);

	/** Read the persisted choice (client only). Call once on mount. */
	init() {
		if (typeof localStorage === 'undefined') return;
		const stored = read<string>(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
		if (stored && themes.some((t) => t.slug === stored)) this.active = stored;
		const custom = read<AppliedTokens>(STORAGE_CUSTOM);
		if (custom?.light && custom?.dark) this.custom = custom;
	}

	set(slug: string | null) {
		this.active = slug;
		this.custom = null;
		write(STORAGE_KEY, slug);
		write(STORAGE_CUSTOM, null);
	}

	/** Apply a theme from the builder across the site. */
	apply(tokens: AppliedTokens) {
		this.custom = tokens;
		write(STORAGE_CUSTOM, tokens);
	}

	reset() {
		this.set(null);
	}
}

export const themeStore = new ThemeStore();

/**
 * Write (or clear) a theme's tokens on <html> for one colour mode: the
 * builder's `custom` tokens if given, else the preset `active` names.
 */
export function applyActiveTheme(
	active: string | null,
	dark: boolean,
	custom: AppliedTokens | null = null
) {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	for (const key of PRESET_KEYS) root.style.removeProperty(`--${key}`);
	for (const key of appliedKeys) root.style.removeProperty(`--${key}`);
	appliedKeys = [];

	const source = custom ?? themes.find((t) => t.slug === active) ?? null;
	if (!source) {
		write(STORAGE_VARS, null);
		return;
	}

	// `.dark` inherits what it doesn't set from `:root`, as theme files do.
	const tokens = dark ? { ...source.light, ...source.dark } : source.light;
	const resolved: Record<string, string> = {};
	for (const [key, value] of Object.entries(tokens)) {
		root.style.setProperty(`--${key}`, value);
		resolved[`--${key}`] = value;
	}
	appliedKeys = Object.keys(tokens);
	write(STORAGE_VARS, resolved);
}
