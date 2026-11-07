import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	DEFAULT_PRESET,
	PRESET_ORDER,
	parseTokens,
	readPresets,
	themesDir
} from './theme-presets.mjs';

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

	it('takes names from the header comment and tokens from both modes', () => {
		const rose = readPresets().find((p) => p.slug === 'rose');

		expect(rose?.name).toBe('Rosé');
		expect(rose?.light.primary).toBe('oklch(0.58 0.17 13)');
		expect(rose?.dark.primary).toMatch(/^oklch\(/);
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

describe('parseTokens', () => {
	it('reads the declarations of the named block only', () => {
		const css = ':root { --a: 1px; --b-c: oklch(1 0 0); }\n.dark { --a: 2px; }';

		expect(parseTokens(css, ':root')).toEqual({ a: '1px', 'b-c': 'oklch(1 0 0)' });
		expect(parseTokens(css, '\\.dark')).toEqual({ a: '2px' });
		expect(parseTokens(css, '\\.missing')).toEqual({});
	});
});

describe('theme.css', () => {
	// theme.css bakes in the default preset, so it must agree with the preset
	// file a site imports to return to that default.
	const base = read(path.join(pkgRoot, 'src/lib/theme.css')).split('@layer base')[1];
	const builtIn = { light: parseTokens(base, ':root'), dark: parseTokens(base, '\\.dark') };
	const preset = readPresets().find((p) => p.default);

	it('ships the default preset tokens in light mode', () => {
		for (const [token, value] of Object.entries(preset.light)) {
			expect(builtIn.light[token], `--${token}`).toBe(value);
		}
	});

	it('ships the default preset tokens in dark mode', () => {
		// .dark inherits anything it does not set (such as --radius) from :root.
		for (const [token, value] of Object.entries(preset.dark)) {
			expect(builtIn.dark[token] ?? builtIn.light[token], `--${token}`).toBe(value);
		}
	});

	it('sets no dark token the default preset leaves out', () => {
		// Otherwise importing the default preset after another one would not
		// reset that token.
		for (const token of Object.keys(builtIn.dark)) {
			expect(preset.dark, `--${token}`).toHaveProperty(token);
		}
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
