import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { presetNames } from '#lib/buildtime/vite/theme.js';
import { themeTokens } from '#lib/core/theme-file.js';
import { DEFAULT_OG_COLOURS, ogColours, toSatoriColour } from './colours.js';

describe('toSatoriColour', () => {
	it('converts oklch to hex', () => {
		expect(toSatoriColour('oklch(1 0 0)')).toBe('#ffffff');
		expect(toSatoriColour('oklch(0 0 0)')).toBe('#000000');
		expect(toSatoriColour('oklch(0.8109 0 0)')).toBe('#c1c1c1');
		expect(toSatoriColour('oklch(0.7214 0.1337 49.9802)')).toBe('#e78a53');
		// Percentages and a `deg` hue read the same.
		expect(toSatoriColour('oklch(72.14% 0.1337 49.9802deg)')).toBe('#e78a53');
	});

	it('keeps alpha as rgba()', () => {
		expect(toSatoriColour('oklch(1 0 0 / 10%)')).toBe('rgba(255, 255, 255, 0.1)');
		expect(toSatoriColour('oklch(1 0 0 / 1)')).toBe('#ffffff');
	});

	it('clips colours outside sRGB instead of failing', () => {
		expect(toSatoriColour('oklch(0.9 0.4 145)')).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('passes through what satori already reads', () => {
		expect(toSatoriColour('#0ea5e9')).toBe('#0ea5e9');
		expect(toSatoriColour('rgb(1 2 3)')).toBe('rgb(1 2 3)');
		expect(toSatoriColour('hsl(222 47% 11%)')).toBe('hsl(222 47% 11%)');
	});

	it('wraps the bare HSL channels older shadcn themes use', () => {
		expect(toSatoriColour('222.2 84% 4.9%')).toBe('hsl(222.2 84% 4.9%)');
	});

	it("gives up on what it can't read", () => {
		expect(toSatoriColour('var(--x)')).toBeUndefined();
		expect(toSatoriColour('oklch(0.5 0.1)')).toBeUndefined();
		expect(toSatoriColour('')).toBeUndefined();
	});
});

describe('ogColours', () => {
	it('prefers the dark colour mode, then the light one, then the defaults', () => {
		expect(
			ogColours({
				light: { background: '#ffffff', primary: '#ff0000' },
				dark: { background: '#000000', border: 'var(--nope)' }
			})
		).toEqual({ ...DEFAULT_OG_COLOURS, background: '#000000', primary: '#ff0000' });
	});

	it('reads the default preset as the defaults', () => {
		const dir = path.resolve(import.meta.dirname, '../../themes');
		const source = fs.readFileSync(path.join(dir, 'darkmatter.css'), 'utf8');
		expect(ogColours(themeTokens(source))).toEqual(DEFAULT_OG_COLOURS);
	});

	it.each(presetNames())('reads every colour of the %s preset', (preset) => {
		const dir = path.resolve(import.meta.dirname, '../../themes');
		const tokens = themeTokens(fs.readFileSync(path.join(dir, `${preset}.css`), 'utf8'));
		for (const name of ['background', 'foreground', 'muted-foreground', 'primary', 'border']) {
			expect(toSatoriColour(tokens.dark[name]), `${preset} --${name}`).toBeDefined();
		}
	});
});
