#!/usr/bin/env node
/**
 * The theme preset manifest: one reader for the shipped presets in
 * src/lib/themes/*.css, shared by everything that lists them.
 *
 * The CSS files are the source of truth. Each file is one preset: its slug is
 * the file name, its display name comes from the header comment
 * (`svelte-docsmith theme — <Name>.`) and its tokens from the `:root` and
 * `.dark` blocks. The only thing the CSS can't say is the display order, so
 * that lives here in PRESET_ORDER, and readPresets() refuses a preset file that
 * isn't placed in it (or a slug with no file), so the two can't drift.
 *
 * Readers:
 * - sites/docs/scripts/generate-themes.mjs builds the showcase's token data.
 * - create-svelte-docsmith reads presets.json, written by this script, because
 *   the published CLI can't read the library's files at prompt time.
 *
 * Run it to rewrite presets.json after adding, renaming or reordering a preset:
 *
 *   node packages/svelte-docsmith/scripts/theme-presets.mjs
 *
 * The scaffolder's tests fail while presets.json is out of date.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** The shipped preset CSS. */
export const themesDir = path.resolve(here, '../src/lib/themes');

/** The scaffolder's copy of the manifest. */
export const scaffolderManifestPath = path.resolve(
	here,
	'../../create-svelte-docsmith/presets.json'
);

/** The preset a site gets when `docsmith()` names no theme. */
export const DEFAULT_PRESET = 'darkmatter';

/**
 * Picker and display order: the default first, then warm to cool to neutral.
 * The README, the theming page and the scaffolder list them in this order.
 */
export const PRESET_ORDER = [
	'darkmatter',
	'tangerine',
	'amethyst',
	'graphite',
	'evergreen',
	'rose',
	'ocean',
	'nord',
	'claude',
	'bubblegum',
	'mono'
];

/**
 * @typedef {Record<string, string>} ThemeTokens
 * @typedef {{
 *   slug: string;
 *   name: string;
 *   default: boolean;
 *   light: ThemeTokens;
 *   dark: ThemeTokens;
 * }} Preset
 */

/**
 * Every `--token: value;` declaration in the first block opened by `selector`
 * (a regex source, such as `:root` or `\\.dark`). Keys drop the leading `--`.
 *
 * @param {string} css
 * @param {string} selector
 * @returns {ThemeTokens}
 */
export function parseTokens(css, selector) {
	const body = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
	/** @type {ThemeTokens} */
	const tokens = {};
	for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
		tokens[name] = value.trim();
	}
	return tokens;
}

/**
 * The display name from the header comment `svelte-docsmith theme — <Name>.`
 *
 * @param {string} css
 * @param {string} file for the error message
 */
function parseName(css, file) {
	const name = css.match(/svelte-docsmith theme —\s*([^.\n(]+)/)?.[1]?.trim();
	if (!name) {
		throw new Error(`${file}: missing the header line "svelte-docsmith theme — <Name>."`);
	}
	return name;
}

/**
 * Read every preset in display order.
 *
 * @param {string} [dir] the preset CSS directory (tests point it elsewhere)
 * @returns {Preset[]}
 */
export function readPresets(dir = themesDir) {
	const slugs = fs
		.readdirSync(dir)
		.filter((file) => file.endsWith('.css'))
		.map((file) => file.slice(0, -'.css'.length));

	const unplaced = slugs.filter((slug) => !PRESET_ORDER.includes(slug));
	const missing = PRESET_ORDER.filter((slug) => !slugs.includes(slug));
	if (unplaced.length || missing.length) {
		const problems = [
			unplaced.length && `not in PRESET_ORDER: ${unplaced.join(', ')}`,
			missing.length && `listed in PRESET_ORDER with no CSS file: ${missing.join(', ')}`
		].filter(Boolean);
		throw new Error(`Theme presets out of sync (${problems.join('; ')}).`);
	}

	return PRESET_ORDER.map((slug) => {
		const file = path.join(dir, `${slug}.css`);
		const css = fs.readFileSync(file, 'utf8');
		return {
			slug,
			name: parseName(css, file),
			default: slug === DEFAULT_PRESET,
			light: parseTokens(css, ':root'),
			dark: parseTokens(css, '\\.dark')
		};
	});
}

/**
 * The scaffolder's manifest: what its theme prompt needs, nothing more.
 *
 * @param {Preset[]} presets
 */
export function scaffolderManifest(presets) {
	const manifest = presets.map(({ slug, name, default: isDefault }) =>
		isDefault ? { slug, name, default: true } : { slug, name }
	);
	return `${JSON.stringify(manifest, null, '\t')}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	fs.writeFileSync(scaffolderManifestPath, scaffolderManifest(readPresets()));
	console.log(`Wrote ${path.relative(process.cwd(), scaffolderManifestPath)}.`);
}
