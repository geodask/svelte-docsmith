/**
 * `svelte-docsmith/vite` — build-time helpers. Node context only.
 */
import fs from 'node:fs';
import type { Plugin } from 'vite';
import { DEFAULT_THEMES, lazyHighlighter } from './highlight.js';

const PREFIX = '\0docsmith-source:';
// The virtual id must NOT end in `.svelte`, or vite-plugin-svelte will try to
// compile the highlighted-HTML string as a component.
const VIRTUAL_EXT = '.docsmith-src';
const SUFFIX = '?source';

export interface ExampleSourceOptions {
	/** Shiki themes for the dual light/dark render. Default: github-light/github-dark. */
	themes?: { light: string; dark: string };
}

/**
 * Vite plugin: importing `some-component.svelte?source` returns that file's
 * source, syntax-highlighted with Shiki at build time, as the default export.
 *
 * Paired with `LiveExample`, this gives single-source-of-truth live examples:
 * the `.svelte` file is both rendered (normal import) and shown (this import)
 * — the two can never drift.
 */
export function exampleSource(options: ExampleSourceOptions = {}): Plugin {
	const themes = options.themes ?? DEFAULT_THEMES;
	const getHighlighter = lazyHighlighter([themes.light, themes.dark], ['svelte']);

	return {
		name: 'docsmith-example-source',
		enforce: 'pre',

		async resolveId(id, importer) {
			if (!id.endsWith('.svelte' + SUFFIX)) return;
			const base = id.slice(0, -SUFFIX.length);
			const resolved = await this.resolve(base, importer, { skipSelf: true });
			if (resolved) return PREFIX + resolved.id + VIRTUAL_EXT;
		},

		async load(id) {
			if (!id.startsWith(PREFIX)) return;
			const file = id.slice(PREFIX.length, -VIRTUAL_EXT.length);
			this.addWatchFile(file);

			const code = fs.readFileSync(file, 'utf-8').trimEnd();
			const highlighter = await getHighlighter();
			const html = highlighter.codeToHtml(code, { lang: 'svelte', themes });
			return `export default ${JSON.stringify(html)};`;
		}
	};
}
