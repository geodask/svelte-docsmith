import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	COLOUR_TOKENS,
	contrast,
	contrastIssues,
	decodeThemeLink,
	defaultInputs,
	emptyState,
	encodePasteCode,
	encodeThemeLink,
	fromTokens,
	generate,
	inferInputs,
	modeTokens,
	parseColour,
	parseThemeFile,
	resolve,
	setInputs,
	setToken,
	clearToken,
	writeThemeFile,
	type ThemeTokens
} from './core.ts';

const presetsDir = path.resolve(
	import.meta.dirname,
	'../../../../../packages/svelte-docsmith/src/lib/themes'
);
const readPreset = (f: string) => fs.readFileSync(path.join(presetsDir, f), 'utf8');

/**
 * A v1 theme link payload, built by hand from the documented format with no
 * `inputs` (what an agent produces). The CLI's tests decode the same string.
 */
export const LINK_FIXTURE =
	'dc3hCsIgGIXhW5Hzq0Dkc-AK78ambeI249sWxPDeQyKIYP8OPPCeHU9YLbHmFOYFdscY-2Gt4-a61HPeZg-LnMZuOGlBgs6QuGcOf0aq-eqD4-T49UPGiOpNa6qz83FbYEHKcJhQJLzjdHBKSl-PyxdBSrefcinlDQ';

const brands = [
	'#d97a2b',
	'#e11d48',
	'#7c3aed',
	'#2563eb',
	'#0891b2',
	'#059669',
	'#65a30d',
	'#18181b',
	'#facc15',
	'#ffffff',
	'#000000'
];

describe('generate', () => {
	it('sets every colour, code and non-colour token, in both modes', () => {
		const { light, dark } = generate(defaultInputs);
		for (const key of COLOUR_TOKENS) {
			expect(light[key], key).toBeTruthy();
			expect(dark[key], key).toBeTruthy();
		}
		for (const key of [
			'radius',
			'font-sans',
			'font-mono',
			'shadow-sm',
			'code-token-keyword',
			'code-token-comment'
		]) {
			expect(modeTokens({ light, dark }, 'dark')[key], key).toBeTruthy();
		}
	});

	it('keeps every text token at WCAG AA, across brands, tints and both modes', () => {
		for (const brand of brands) {
			for (const tint of [0, 0.5, 1]) {
				expect(
					contrastIssues(generate({ ...defaultInputs, brand, tint })),
					`${brand} at ${tint}`
				).toEqual([]);
			}
		}
	});

	it('names the fonts with a fallback, and leaves system stacks alone', () => {
		expect(generate({ ...defaultInputs, fontSans: 'Geist' }).light['font-sans']).toBe(
			"'Geist', sans-serif"
		);
		expect(generate({ ...defaultInputs, fontSans: 'Source Serif 4' }).light['font-sans']).toBe(
			"'Source Serif 4', serif"
		);
		expect(generate({ ...defaultInputs, fontMono: 'ui-monospace' }).light['font-mono']).toBe(
			'ui-monospace'
		);
	});
});

describe('overrides', () => {
	it('show on top of the generated tokens', () => {
		const state = setToken(emptyState(), 'dark', 'primary', 'oklch(0.5 0.1 10)');
		expect(resolve(state).dark.primary).toBe('oklch(0.5 0.1 10)');
		expect(resolve(clearToken(state, 'dark', 'primary')).dark.primary).toBe(
			generate(defaultInputs).dark.primary
		);
	});

	it('drop exactly what a guided change moves', () => {
		let state = setToken(emptyState(), 'light', 'primary', 'red');
		state = setToken(state, 'light', 'radius', '2rem');
		const moved = setInputs(state, { brand: '#2563eb' });
		expect(moved.overrides.light).toEqual({ radius: '2rem' });
		const rounded = setInputs(state, { radius: 0.25 });
		expect(rounded.overrides.light).toEqual({ primary: 'red' });
	});

	it('let a shared control move dark mode too, even when dark repeats it', () => {
		// A preset's .dark block often restates radius, fonts or shadows.
		let state = fromTokens({
			light: {
				...generate(defaultInputs).light,
				radius: '0.5rem',
				'font-sans': 'Inter, sans-serif'
			},
			dark: { ...generate(defaultInputs).dark, radius: '0.5rem', 'font-sans': 'Inter, sans-serif' }
		});
		state = setInputs(state, { radius: 1.25, fontSans: 'Geist' });
		const dark = modeTokens(resolve(state), 'dark');
		expect(dark.radius).toBe('1.25rem');
		expect(dark['font-sans']).toBe(modeTokens(resolve(state), 'light')['font-sans']);
	});

	it('make a preset the starting point, with the controls read back from it', () => {
		const rose = parseThemeFile(readPreset('rose.css')) as ThemeTokens;
		const state = fromTokens(rose);
		expect(resolve(state)).toEqual({
			light: { ...generate(state.inputs).light, ...rose.light },
			dark: { ...generate(state.inputs).dark, ...rose.dark }
		});
		expect(state.inputs.radius).toBe(parseFloat(rose.light.radius));
		expect(
			contrast(parseColour(state.inputs.brand)!, parseColour(rose.light.primary)!)
		).toBeLessThan(1.05);
	});
});

describe('inferInputs', () => {
	it('reads shadows and fonts back', () => {
		for (const shadow of ['none', 'soft', 'crisp', 'offset'] as const) {
			const t = generate({
				...defaultInputs,
				shadow,
				fontSans: 'IBM Plex Sans',
				fontMono: 'Fira Code'
			});
			expect(inferInputs(t)).toMatchObject({
				shadow,
				fontSans: 'IBM Plex Sans',
				fontMono: 'Fira Code'
			});
		}
	});
});

describe('parseColour', () => {
	it('reads oklch, hex and hsl', () => {
		expect(parseColour('oklch(0.5 0.1 200)')).toEqual([0.5, 0.1, 200]);
		expect(parseColour('oklch(50% 0.1 200)')).toEqual([0.5, 0.1, 200]);
		expect(parseColour('#ffffff')![0]).toBeCloseTo(1, 3);
		expect(parseColour('hsl(0 0% 0%)')![0]).toBeCloseTo(0, 3);
		expect(parseColour('var(--x)')).toBeNull();
	});
});

describe('theme files', () => {
	it('reject text that is not a theme, saying why', () => {
		expect(parseThemeFile('body { color: red }')).toEqual({
			error: expect.stringMatching(/:root/)
		});
	});

	it('round-trip, writing only what .dark changes', () => {
		const tokens = resolve(emptyState());
		const file = writeThemeFile(tokens);
		const back = parseThemeFile(file) as ThemeTokens;
		expect(back.light).toEqual(tokens.light);
		expect(modeTokens(back, 'dark')).toEqual(modeTokens(tokens, 'dark'));
		expect(back.dark.radius).toBeUndefined();
	});
});

describe('theme links', () => {
	it('round-trip the whole theme and the control positions', async () => {
		const state = setToken(
			setInputs(emptyState(), { brand: '#059669', shadow: 'crisp' }),
			'dark',
			'ring',
			'red'
		);
		const back = await decodeThemeLink(await encodeThemeLink(state));
		expect(resolve(back)).toEqual(resolve(state));
		expect(back.inputs).toEqual(state.inputs);
	});

	it('decode the documented v1 format, without inputs', async () => {
		const state = await decodeThemeLink(LINK_FIXTURE);
		expect(resolve(state).light.primary).toBe('oklch(0.55 0.2 265)');
		expect(resolve(state).dark.background).toBe('oklch(0.18 0 0)');
		expect(state.inputs.radius).toBe(0.5);
	});

	it('reject damaged links and unknown versions', async () => {
		await expect(decodeThemeLink('not-a-link')).rejects.toThrow(/damaged/);
		const { deflateRawSync } = await import('node:zlib');
		const v2 = deflateRawSync(JSON.stringify({ v: 2, tokens: {} })).toString('base64url');
		await expect(decodeThemeLink(v2)).rejects.toThrow(/newer builder/);
	});

	it('keep a paste code readable by plain zlib, as the CLI reads it', async () => {
		const { inflateRawSync } = await import('node:zlib');
		const file = writeThemeFile(resolve(emptyState()));
		const code = await encodePasteCode(file);
		expect(code.startsWith('dsm1.')).toBe(true);
		expect(inflateRawSync(Buffer.from(code.slice(5), 'base64url')).toString()).toBe(file);
	});
});
