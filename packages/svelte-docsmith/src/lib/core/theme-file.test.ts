import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	DEFAULT_PRESET,
	isThemeFile,
	modeTokens,
	readThemeFile,
	themeTokens,
	writeThemeFile
} from './theme-file.js';

const presetsDir = path.resolve(import.meta.dirname, '../themes');
const presets = fs
	.readdirSync(presetsDir)
	.filter((file) => file.endsWith('.css'))
	.map((file) => file.slice(0, -'.css'.length));
const preset = (slug: string) => themeTokens(fs.readFileSync(`${presetsDir}/${slug}.css`, 'utf8'));

describe('reading a theme file', () => {
	it('reads each colour mode, the last declaration winning', () => {
		const tokens = themeTokens(
			':root { --primary: red; --radius: 0.5rem; }\n' +
				'.dark { --primary: blue; }\n' +
				':root { --primary: green; }'
		);
		expect(tokens).toEqual({
			light: { primary: 'green', radius: '0.5rem' },
			dark: { primary: 'blue' }
		});
	});

	it('reads through @layer and skips other selectors and at-rules', () => {
		const tokens = themeTokens(
			'@layer base { :root, .light { --a: 1; } }\n' +
				'.other { --b: 2; }\n' +
				'@theme inline { --color-a: var(--a); }\n' +
				'/* .dark { --c: 3; } */'
		);
		expect(tokens).toEqual({ light: { a: '1' }, dark: {} });
	});

	it('reads a verbatim tweakcn export, ignoring @theme inline', () => {
		const tokens = themeTokens(
			':root {\n  --background: oklch(1 0 0);\n  --primary: oklch(0.6 0.2 30);\n}\n\n' +
				'.dark {\n  --background: oklch(0.2 0 0);\n}\n\n' +
				'@theme inline {\n  --color-background: var(--background);\n}'
		);
		expect(tokens).toEqual({
			light: { background: 'oklch(1 0 0)', primary: 'oklch(0.6 0.2 30)' },
			dark: { background: 'oklch(0.2 0 0)' }
		});
	});

	it('reads a last declaration that has no semicolon', () => {
		expect(themeTokens(':root { --a: 1; --b: 2 }').light).toEqual({ a: '1', b: '2' });
	});

	it('is not thrown by braces and semicolons inside strings', () => {
		const tokens = themeTokens(':root { --font-sans: "A}B{", sans-serif; }\n.dark { --y: 2; }');
		expect(tokens.dark).toEqual({ y: '2' });
	});

	it('keeps every rule in order and lists the imports it wrote', () => {
		const file = readThemeFile(
			"@import url('https://fonts.example/inter.css');\n" +
				':root { --a: 1; }\n' +
				'@layer base { .dark { --a: 2; } }\n' +
				'@custom-variant dark (&:is(.dark *));\n' +
				'.prose { color: red; }'
		);
		expect(file.rules).toEqual([
			':root { --a: 1; }',
			'.dark { --a: 2; }',
			'.prose { color: red; }'
		]);
		expect(file.imports).toEqual(["@import url('https://fonts.example/inter.css')"]);
	});
});

describe('isThemeFile', () => {
	it('takes a file that sets a token in either block', () => {
		expect(isThemeFile(':root { --primary: red; }')).toBe(true);
		expect(isThemeFile('.dark { --primary: red; }')).toBe(true);
	});

	it('refuses text that sets no token', () => {
		expect(isThemeFile('')).toBe(false);
		expect(isThemeFile('body { color: red }')).toBe(false);
		expect(isThemeFile(':root { }')).toBe(false);
		expect(isThemeFile('/* :root { --a: 1; } */')).toBe(false);
	});
});

describe('modeTokens', () => {
	const tokens = { light: { a: '1', radius: '0' }, dark: { a: '2' } };

	it('shows the light tokens as they are', () => {
		expect(modeTokens(tokens, 'light')).toEqual({ a: '1', radius: '0' });
	});

	it('shows dark as light with the dark tokens on top', () => {
		expect(modeTokens(tokens, 'dark')).toEqual({ a: '2', radius: '0' });
	});
});

describe('writing a theme file', () => {
	const tokens = {
		light: { background: 'oklch(1 0 0)', primary: 'oklch(0.55 0.2 265)' },
		dark: { background: 'oklch(0.18 0 0)', primary: 'oklch(0.55 0.2 265)' }
	};

	it('lists :root in full and only what differs under .dark', () => {
		expect(writeThemeFile(tokens)).toBe(
			'/* Made with the svelte-docsmith theme builder: https://docsmith.geodask.com/themes */\n' +
				':root {\n\t--background: oklch(1 0 0);\n\t--primary: oklch(0.55 0.2 265);\n}\n\n' +
				'.dark {\n\t--background: oklch(0.18 0 0);\n}\n'
		);
	});

	it('reads back to the same theme in both colour modes', () => {
		const back = themeTokens(writeThemeFile(tokens));
		expect(back.light).toEqual(tokens.light);
		expect(modeTokens(back, 'dark')).toEqual(modeTokens(tokens, 'dark'));
		expect(isThemeFile(writeThemeFile(tokens))).toBe(true);
	});
});

describe('every preset is a complete theme', () => {
	// The colours the default preset sets are the colours every theme needs.
	const base = preset(DEFAULT_PRESET);
	const colourTokens = Object.keys(base.light).filter((t) => /^oklch/.test(base.light[t]));
	const codeTokens = ['keyword', 'string', 'function', 'constant', 'parameter', 'comment'].map(
		(role) => `code-token-${role}`
	);

	it('has a default preset among them', () => {
		expect(presets).toContain(DEFAULT_PRESET);
		expect(colourTokens.length).toBeGreaterThan(20);
	});

	it.each(presets)('%s sets every colour and code token in both modes', (slug) => {
		const { light, dark } = preset(slug);
		for (const token of [...colourTokens, ...codeTokens]) {
			expect(light, `:root --${token}`).toHaveProperty(token);
			expect(dark, `.dark --${token}`).toHaveProperty(token);
		}
	});
});
