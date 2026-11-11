import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_PRESET as LIBRARY_DEFAULT, themeTokens } from '../src/lib/core/theme-file.ts';
import { DEFAULT_PRESET, PRESET_ORDER, readPresets, themesDir } from './theme-presets.mjs';

const pkgRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(pkgRoot, '../..');
const read = (file) => fs.readFileSync(file, 'utf8');

describe('readPresets', () => {
	/** @type {string[]} */
	const tmpDirs = [];
	afterEach(() => {
		for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
	});

	/** A copy of the shipped presets that a test can break. */
	function copyThemes() {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-themes-'));
		tmpDirs.push(dir);
		fs.cpSync(themesDir, dir, { recursive: true });
		return dir;
	}

	it('reads every shipped preset in display order, default first', () => {
		const presets = readPresets();
		const files = fs.readdirSync(themesDir).filter((f) => f.endsWith('.css'));

		expect(presets.map((p) => p.slug)).toEqual(PRESET_ORDER);
		expect(presets).toHaveLength(files.length);
		expect(presets[0]).toMatchObject({ slug: DEFAULT_PRESET, default: true });
		expect(presets.filter((p) => p.default)).toHaveLength(1);
	});

	it('takes names from the header comment', () => {
		expect(readPresets().find((p) => p.slug === 'rose')?.name).toBe('Rosé');
	});

	it('names the default preset the library falls back to', () => {
		expect(DEFAULT_PRESET).toBe(LIBRARY_DEFAULT);
	});

	it('refuses a preset file that is not placed in the order', () => {
		const dir = copyThemes();
		fs.copyFileSync(path.join(dir, 'ocean.css'), path.join(dir, 'lagoon.css'));

		expect(() => readPresets(dir)).toThrow('not in PRESET_ORDER: lagoon');
	});

	it('refuses a slug in the order that has no file', () => {
		const dir = copyThemes();
		fs.rmSync(path.join(dir, 'nord.css'));

		expect(() => readPresets(dir)).toThrow('listed in PRESET_ORDER with no CSS file: nord');
	});

	it('refuses a preset file without a header name', () => {
		const dir = copyThemes();
		fs.writeFileSync(path.join(dir, 'mono.css'), ':root { --radius: 0; }\n');

		expect(() => readPresets(dir)).toThrow('mono.css: missing the header line');
	});
});

describe('theme.css', () => {
	// The theme comes from docsmith({ theme }), appended by the plugin after
	// theme.css, so theme.css itself must carry no colour: one would be a second
	// default that a partial theme file silently inherits.
	const builtIn = themeTokens(read(path.join(pkgRoot, 'src/lib/theme.css')));
	const preset = themeTokens(read(path.join(themesDir, `${DEFAULT_PRESET}.css`)));
	const isColour = (value) => /^(oklch|hsl|rgb|#)/.test(value);

	it('gives no colour token a colour of its own', () => {
		const colours = Object.keys(preset.light).filter((token) => isColour(preset.light[token]));
		expect(colours.length).toBeGreaterThan(20);
		// A code colour may fall back to a mix of other tokens (ADR-0011), which
		// follows the theme; a literal colour would not.
		for (const token of colours) {
			const value = builtIn.light[token];
			if (value !== undefined)
				expect(value, `--${token}`).toMatch(/^(?:var\(--|color-mix\(.*var\(--)/);
		}
	});

	it('has no dark block', () => {
		expect(builtIn.dark).toEqual({});
	});

	it('declares the marker the plugin appends the theme after', () => {
		expect(builtIn.light['docsmith-theme']).toBe('none');
	});
});

describe('preset lists in the docs', () => {
	/** The backticked slugs in the paragraph that starts with "Available:". */
	function listedSlugs(file) {
		const paragraph = read(file)
			.split(/\n\s*\n/)
			.find((p) => p.startsWith('Available:'));
		expect(paragraph, `${file} has an "Available:" paragraph`).toBeDefined();
		return [...paragraph.matchAll(/`([a-z]+)`/g)].map((m) => m[1]);
	}

	it.each([
		'README.md',
		'packages/svelte-docsmith/README.md',
		'sites/docs/src/routes/docs/theming/+page.md'
	])('%s lists every preset in order', (file) => {
		expect(listedSlugs(path.join(repoRoot, file))).toEqual(PRESET_ORDER);
	});
});
