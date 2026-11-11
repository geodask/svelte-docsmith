/**
 * The theme file: one CSS file of `:root` and `.dark` token blocks, the shape
 * shadcn and tweakcn export (ADR-0010). This module is the one place that
 * knows how to read one and how to write one, so the plugin, the OG images,
 * `svelte-docsmith theme` and the theme builder all agree on what a file says.
 *
 * It has no dependencies, so the builder runs it in the browser too.
 */

/** The preset a site gets when `docsmith()` names no theme. */
export const DEFAULT_PRESET = 'darkmatter';

/** Custom properties by name, without their `--`. */
export type Tokens = Record<string, string>;

/** A theme's tokens as its file declares them, per colour mode. */
export type ThemeTokens = {
	/** What `:root` declares. */
	light: Tokens;
	/** What `.dark` declares: usually only what differs from `:root`. */
	dark: Tokens;
};

export type ColourMode = 'light' | 'dark';

/** A theme file, read. */
export type ThemeFile = {
	/** The custom properties its `:root` and `.dark` rules declare. */
	tokens: ThemeTokens;
	/**
	 * Every rule it holds, in order, each as `selector {declarations}`.
	 * Comments are gone, `@layer` wrappers are unwrapped, and every other
	 * at-rule is left out, block and all.
	 */
	rules: string[];
	/** Each `@import` it wrote, which a theme can't carry. */
	imports: string[];
};

/**
 * Read a theme file. Tokens are read the way the cascade reads them: from
 * every rule whose selector list names `:root` or `.dark`, the last
 * declaration winning. Rules for other selectors carry no tokens, and
 * `@theme inline` and `@custom-variant` (Tailwind's, in a verbatim tweakcn
 * export) are skipped.
 */
export function readThemeFile(source: string): ThemeFile {
	const rules: string[] = [];
	const imports: string[] = [];
	collectRules(source.replace(/\/\*[\s\S]*?\*\//g, ''), rules, imports);

	const tokens: ThemeTokens = { light: {}, dark: {} };
	for (const rule of rules) {
		const open = rule.indexOf('{');
		const selectors = rule
			.slice(0, open)
			.split(',')
			.map((s) => s.trim());
		const targets = [
			...(selectors.includes(':root') ? [tokens.light] : []),
			...(selectors.includes('.dark') ? [tokens.dark] : [])
		];
		if (targets.length === 0) continue;
		for (const match of rule.slice(open + 1, -1).matchAll(/--([\w-]+)\s*:\s*([^;]+)/g)) {
			for (const target of targets) target[match[1]] = match[2].trim();
		}
	}
	return { tokens, rules, imports };
}

/** A theme file's tokens. Short for `readThemeFile(source).tokens`. */
export function themeTokens(source: string): ThemeTokens {
	return readThemeFile(source).tokens;
}

/**
 * Whether text is a theme file at all: it sets at least one token, in `:root`
 * or `.dark`. What `svelte-docsmith theme` and the builder's import both ask
 * before taking a file.
 */
export function isThemeFile(source: string): boolean {
	const { light, dark } = themeTokens(source);
	return Object.keys(light).length > 0 || Object.keys(dark).length > 0;
}

/**
 * The tokens a colour mode actually shows. `.dark` inherits what it doesn't
 * set from `:root`, so the dark mode is the light tokens with the dark ones on
 * top.
 */
export function modeTokens(tokens: ThemeTokens, mode: ColourMode): Tokens {
	return mode === 'light' ? tokens.light : { ...tokens.light, ...tokens.dark };
}

/** Write a theme file: `:root` in full, `.dark` with only what differs from it. */
export function writeThemeFile(tokens: ThemeTokens): string {
	const lines = (t: Tokens) =>
		Object.entries(t)
			.map(([k, v]) => `\t--${k}: ${v};`)
			.join('\n');
	const darkOnly = Object.fromEntries(
		Object.entries(tokens.dark).filter(([k, v]) => tokens.light[k] !== v)
	);
	return (
		'/* Made with the svelte-docsmith theme builder: https://docsmith.geodask.com/themes */\n' +
		`:root {\n${lines(tokens.light)}\n}\n\n.dark {\n${lines(darkOnly)}\n}\n`
	);
}

/**
 * Walk one level of statements: a qualified rule (`:root { … }`) is kept
 * whole, an `@layer` block is walked into, and any other at-rule is skipped,
 * block and all.
 */
function collectRules(css: string, rules: string[], imports: string[]) {
	let i = 0;
	while (i < css.length) {
		while (i < css.length && /\s/.test(css[i])) i++;
		if (i >= css.length) break;
		const start = i;
		// The prelude runs to the statement's `;` or its block's `{`.
		while (i < css.length && css[i] !== '{' && css[i] !== ';') i = skipString(css, i) + 1;
		const prelude = css.slice(start, i).trim();
		if (css[i] === ';' || i >= css.length) {
			if (/^@import\b/i.test(prelude)) imports.push(prelude);
			i++;
			continue;
		}
		const end = matchingBrace(css, i);
		const body = css.slice(i + 1, end);
		if (/^@layer\b/i.test(prelude)) collectRules(body, rules, imports);
		else if (!prelude.startsWith('@')) rules.push(`${prelude} {${body}}`);
		i = end + 1;
	}
}

/** Index of the last character of a string starting at `i`, or `i` itself. */
function skipString(css: string, i: number): number {
	const quote = css[i];
	if (quote !== '"' && quote !== "'") return i;
	let j = i + 1;
	while (j < css.length && css[j] !== quote) j += css[j] === '\\' ? 2 : 1;
	return j;
}

/** Index of the `}` closing the block opened at `open`. */
function matchingBrace(css: string, open: number): number {
	let depth = 0;
	for (let i = open; i < css.length; i = skipString(css, i) + 1) {
		if (css[i] === '{') depth++;
		else if (css[i] === '}' && --depth === 0) return i;
	}
	return css.length;
}
