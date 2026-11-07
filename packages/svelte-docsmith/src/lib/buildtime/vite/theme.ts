/**
 * The site's theme: which file `docsmith({ theme })` names, and how its tokens
 * reach every page.
 *
 * A theme is one CSS file of `:root` and `.dark` token blocks, the shape shadcn
 * and tweakcn export (see ADR-0010). `theme.css` carries no colours of its own;
 * it marks itself with {@link THEME_MARKER}, and the plugin appends the chosen
 * theme, wrapped in the `base` cascade layer, to whatever stylesheet that
 * marker ends up in once Tailwind has compiled it. So every page that imports
 * `theme.css` gets the theme with no import of its own, server-rendered, and
 * an unlayered token the author writes in `app.css` always wins over it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** The preset a site gets when it names no theme. */
export const DEFAULT_THEME = 'darkmatter';

/**
 * The custom property `theme.css` declares so the plugin can find the compiled
 * stylesheet it ended up in. It survives Tailwind and Lightning CSS untouched.
 */
export const THEME_MARKER = '--docsmith-theme';

const MARKER_RE = new RegExp(`${THEME_MARKER}\\s*:`);

/** The shipped presets: `dist/themes` in the package, `src/lib/themes` under test. */
const presetsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../themes');

/** The slug of every shipped preset, alphabetically. */
export function presetNames(dir: string = presetsDir): string[] {
	return fs
		.readdirSync(dir)
		.filter((file) => file.endsWith('.css'))
		.map((file) => file.slice(0, -'.css'.length))
		.sort();
}

/**
 * Resolve `docsmith({ theme })` to the absolute path of a theme file: a preset
 * name to the package's own file, anything else to a path against `cwd`.
 * Throws at startup on an unknown preset or a missing file, so a typo never
 * quietly falls back to the default look.
 */
export function resolveTheme(
	theme: unknown,
	cwd: string,
	dir: string = presetsDir
): string {
	const value = theme ?? DEFAULT_THEME;
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(
			"[svelte-docsmith] docsmith({ theme }) takes a preset name or a path to a theme file, e.g. theme: 'ocean' or theme: './src/theme.css', " +
				`got ${JSON.stringify(value)}.`
		);
	}
	const presets = presetNames(dir);
	if (presets.includes(value)) return path.join(dir, `${value}.css`);
	const looksLikePath = /[/\\]/.test(value) || value.endsWith('.css');
	if (!looksLikePath) {
		throw new Error(
			`[svelte-docsmith] unknown theme ${JSON.stringify(value)}. ` +
				`Presets: ${presets.join(', ')}. For your own theme, give a path like './src/theme.css'.`
		);
	}
	const file = path.resolve(cwd, value);
	if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
		throw new Error(`[svelte-docsmith] theme file not found: ${file}`);
	}
	return file;
}

/** A theme file reduced to what the page can use. */
export interface ThemeLayer {
	/** The theme's rules wrapped in `@layer base { … }`. */
	css: string;
	/** Each `@import` the file wrote, which a layer can't hold and so was left out. */
	droppedImports: string[];
}

/**
 * Reduce a theme file to its rules and wrap them in the `base` layer. Comments
 * go, `@layer` wrappers are unwrapped, and every other at-rule is left out:
 * `@theme inline` and `@custom-variant` are Tailwind's (whose job `theme.css`
 * already does), and `@import` can't sit inside a layer, so the caller says
 * so. That makes a verbatim tweakcn export a valid theme file.
 */
export function themeLayer(source: string): ThemeLayer {
	const droppedImports: string[] = [];
	const rules: string[] = [];
	collectRules(stripComments(source), rules, droppedImports);
	return {
		css: `@layer base {\n${rules.join('\n')}\n}\n`,
		droppedImports
	};
}

function stripComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Walk one level of statements: a qualified rule (`:root { … }`) is kept
 * whole, an `@layer` block is walked into, and any other at-rule is skipped,
 * block and all.
 */
function collectRules(css: string, rules: string[], droppedImports: string[]) {
	let i = 0;
	while (i < css.length) {
		while (i < css.length && /\s/.test(css[i])) i++;
		if (i >= css.length) break;
		const start = i;
		// The prelude runs to the statement's `;` or its block's `{`.
		while (i < css.length && css[i] !== '{' && css[i] !== ';') i = skipString(css, i) + 1;
		const prelude = css.slice(start, i).trim();
		if (css[i] === ';' || i >= css.length) {
			if (/^@import\b/i.test(prelude)) droppedImports.push(prelude);
			i++;
			continue;
		}
		const end = matchingBrace(css, i);
		const body = css.slice(i + 1, end);
		if (/^@layer\b/i.test(prelude)) collectRules(body, rules, droppedImports);
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

/** Whether compiled CSS is the stylesheet `theme.css` ended up in. */
export function hasThemeMarker(css: string): boolean {
	return MARKER_RE.test(css);
}

/**
 * The plugin that appends the theme to the stylesheet `theme.css` compiled
 * into. It runs as a normal plugin, so after Tailwind (whose plugins run
 * `pre`) and Vite's own CSS step, and before the stylesheet is turned into a
 * module. Watching the theme file makes an edit to it hot-update that
 * stylesheet in `vite dev`.
 */
export function themePlugin(themeFile: string): Plugin {
	let warned = false;
	return {
		name: 'docsmith-theme',
		transform(code, id) {
			if (!isCssId(id) || !hasThemeMarker(code)) return;
			this.addWatchFile(themeFile);
			const { css, droppedImports } = themeLayer(fs.readFileSync(themeFile, 'utf8'));
			if (droppedImports.length && !warned) {
				warned = true;
				this.warn(
					`[svelte-docsmith] the theme file ${themeFile} has @import rules, which a theme can't carry: ` +
						`${droppedImports.join(', ')}. Load fonts and other stylesheets from app.css or app.html instead.`
				);
			}
			return { code: `${code}\n${css}`, map: null };
		}
	};
}

function isCssId(id: string): boolean {
	return /\.css(?:$|\?)/.test(id) && !id.includes('?inline') && !id.includes('?url');
}
