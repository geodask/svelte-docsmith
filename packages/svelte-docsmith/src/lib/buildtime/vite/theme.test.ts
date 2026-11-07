import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { docsmith, type DocsmithOptions } from './index.js';
import { hasThemeMarker, presetNames, resolveTheme, themeLayer } from './theme.js';
import type { Plugin } from 'vite';

type Transform = (
	this: unknown,
	code: string,
	id: string
) => { code: string; map: null } | undefined;

const presetsDir = path.resolve(import.meta.dirname, '../../themes');
const themeCss = fs.readFileSync(path.resolve(import.meta.dirname, '../../theme.css'), 'utf8');

let dir: string;
afterEach(() => {
	if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

function tmp(files: Record<string, string> = {}) {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docsmith-theme-'));
	for (const [name, content] of Object.entries(files)) {
		fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
		fs.writeFileSync(path.join(dir, name), content);
	}
	return dir;
}

function themePlugin(options: Partial<DocsmithOptions> = {}): Plugin {
	return docsmith({ site: { title: 'Docs' }, ...options }).find(
		(p) => p.name === 'docsmith-theme'
	) as Plugin;
}

/** Run the theme plugin's transform on a stylesheet, as Vite would after Tailwind. */
function transform(plugin: Plugin, code: string, id = '/app/src/app.css') {
	const context = { addWatchFile: vi.fn(), warn: vi.fn() };
	const result = (plugin.transform as unknown as Transform).call(context, code, id);
	return { result, context };
}

describe('resolveTheme', () => {
	it('resolves a preset name to the shipped file', () => {
		expect(resolveTheme('ocean', '/anywhere')).toBe(path.join(presetsDir, 'ocean.css'));
	});

	it('defaults to Darkmatter', () => {
		expect(resolveTheme(undefined, '/anywhere')).toBe(path.join(presetsDir, 'darkmatter.css'));
	});

	it('resolves a path against the Vite root', () => {
		const root = tmp({ 'src/theme.css': ':root { --primary: red; }' });
		expect(resolveTheme('./src/theme.css', root)).toBe(path.join(root, 'src/theme.css'));
	});

	it('rejects an unknown preset, listing the presets', () => {
		expect(() => resolveTheme('oceann', '/anywhere')).toThrow(
			/unknown theme "oceann"\. Presets: .*darkmatter.*ocean/
		);
	});

	it('rejects a missing theme file, naming the resolved path', () => {
		const root = tmp();
		expect(() => resolveTheme('./src/theme.css', root)).toThrow(
			`theme file not found: ${path.join(root, 'src/theme.css')}`
		);
	});

	it('rejects a value that is not a string', () => {
		expect(() => resolveTheme({ preset: 'ocean' }, '/anywhere')).toThrow(
			/takes a preset name or a path/
		);
	});

	it('lists every shipped preset', () => {
		expect(presetNames()).toEqual(
			fs
				.readdirSync(presetsDir)
				.map((f) => f.replace(/\.css$/, ''))
				.sort()
		);
	});

	it('is checked when docsmith() starts', () => {
		expect(() => docsmith({ site: { title: 'Docs' }, theme: 'nope' })).toThrow(/unknown theme/);
	});
});

describe('themeLayer', () => {
	it('wraps the rules in the base layer', () => {
		const { css } = themeLayer(':root { --primary: red; }\n.dark { --primary: blue; }');
		expect(css).toBe(
			'@layer base {\n:root { --primary: red; }\n.dark { --primary: blue; }\n}\n'
		);
	});

	it('keeps a verbatim tweakcn export to its rules', () => {
		const tweakcn = `:root {
  --background: oklch(1 0 0);
  --font-sans: "Inter", sans-serif;
}

.dark {
  --background: oklch(0.2 0 0);
}

@theme inline {
  --color-background: var(--background);
  --font-sans: var(--font-sans);
}`;
		const { css, droppedImports } = themeLayer(tweakcn);
		expect(css).toContain(':root {');
		expect(css).toContain('--font-sans: "Inter", sans-serif;');
		expect(css).toContain('.dark {');
		expect(css).not.toContain('@theme');
		expect(css).not.toContain('--color-background');
		expect(droppedImports).toEqual([]);
	});

	it('unwraps an @layer the file already uses', () => {
		const { css } = themeLayer('@layer base { :root { --radius: 0; } }');
		expect(css).toBe('@layer base {\n:root { --radius: 0; }\n}\n');
	});

	it('leaves @import out and reports it', () => {
		const { css, droppedImports } = themeLayer(
			"@import url('https://fonts.googleapis.com/css2?family=Inter');\n:root { --radius: 0; }"
		);
		expect(css).not.toContain('@import');
		expect(droppedImports).toEqual([
			"@import url('https://fonts.googleapis.com/css2?family=Inter')"
		]);
	});

	it('ignores braces and semicolons inside strings and comments', () => {
		const { css } = themeLayer(
			'/* :root { --x: 1; } */\n:root { --font-sans: "A;B{"; }\n.dark { --y: 2; }'
		);
		expect(css).toBe('@layer base {\n:root { --font-sans: "A;B{"; }\n.dark { --y: 2; }\n}\n');
	});
});

describe('the theme plugin', () => {
	it('finds the marker in theme.css, before and after minifying', () => {
		expect(hasThemeMarker(themeCss)).toBe(true);
		expect(hasThemeMarker(':root{--docsmith-theme:none;--radius:1rem}')).toBe(true);
		expect(hasThemeMarker(':root { --primary: red; }')).toBe(false);
	});

	it('appends the chosen preset, layered, to the stylesheet theme.css compiled into', () => {
		const { result, context } = transform(
			themePlugin({ theme: 'ocean' }),
			':root{--docsmith-theme:none}'
		);
		const ocean = fs.readFileSync(path.join(presetsDir, 'ocean.css'), 'utf8');
		expect(result?.code).toBe(`:root{--docsmith-theme:none}\n${themeLayer(ocean).css}`);
		expect(result?.code).toMatch(/@layer base \{\n:root \{[^}]*--primary: oklch\(0\.55 0\.11 220\)/);
		expect(context.addWatchFile).toHaveBeenCalledWith(path.join(presetsDir, 'ocean.css'));
	});

	it('serves Darkmatter when no theme is named', () => {
		const { result } = transform(themePlugin(), ':root{--docsmith-theme:none}');
		expect(result?.code).toContain('--primary: oklch(0.6716 0.1368 48.513)');
	});

	it('serves a theme file by path and re-reads it on every transform', () => {
		const root = tmp({ 'theme.css': ':root { --primary: red; }' });
		const plugin = themePlugin({ theme: path.join(root, 'theme.css') });
		expect(transform(plugin, '--docsmith-theme: none;').result?.code).toContain('--primary: red;');

		fs.writeFileSync(path.join(root, 'theme.css'), ':root { --primary: blue; }');
		expect(transform(plugin, '--docsmith-theme: none;').result?.code).toContain(
			'--primary: blue;'
		);
	});

	it('leaves stylesheets without the marker alone', () => {
		const plugin = themePlugin();
		expect(transform(plugin, '.a { color: red; }').result).toBeUndefined();
		expect(transform(plugin, '--docsmith-theme: none;', '/app/src/main.ts').result).toBeUndefined();
		expect(
			transform(plugin, '--docsmith-theme: none;', '/app/src/app.css?inline').result
		).toBeUndefined();
	});

	it('warns once when the theme file has @import rules', () => {
		const root = tmp({ 'theme.css': "@import url('fonts.css');\n:root { --radius: 0; }" });
		const plugin = themePlugin({ theme: path.join(root, 'theme.css') });
		const first = transform(plugin, '--docsmith-theme: none;');
		const second = transform(plugin, '--docsmith-theme: none;');
		expect(first.context.warn).toHaveBeenCalledWith(expect.stringMatching(/@import rules/));
		expect(second.context.warn).not.toHaveBeenCalled();
	});
});
