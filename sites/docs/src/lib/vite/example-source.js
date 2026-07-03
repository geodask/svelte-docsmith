// @ts-nocheck - build-tool plugin: uses Rollup PluginContext (`this.resolve`,
// `this.addWatchFile`) and node builtins, which the app's svelte-check tsconfig
// doesn't type. Verified via the production build.
import fs from 'node:fs';
import { createHighlighter } from 'shiki';

/**
 * Vite plugin: importing `some-component.svelte?source` returns that file's
 * source, syntax-highlighted with Shiki at build time, as the default export.
 *
 * Paired with the library's `LiveExample`, this gives single-source-of-truth
 * live examples: the `.svelte` file is both rendered (normal import) and shown
 * (this import) — the two can never drift.
 *
 * The `?source` id is resolved to a `\0`-prefixed virtual module so
 * vite-plugin-svelte doesn't try to compile the highlighted-HTML string as a
 * component.
 */
const PREFIX = '\0docsmith-source:';
// The virtual id must NOT end in `.svelte`, or vite-plugin-svelte will try to
// compile the highlighted-HTML string as a component.
const VIRTUAL_EXT = '.docsmith-src';
const SUFFIX = '?source';

export function exampleSource() {
	/** @type {Promise<import('shiki').Highlighter> | undefined} */
	let highlighterPromise;

	const getHighlighter = () => {
		highlighterPromise ??= createHighlighter({
			themes: ['github-light', 'github-dark'],
			langs: ['svelte']
		});
		return highlighterPromise;
	};

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
			const html = highlighter.codeToHtml(code, {
				lang: 'svelte',
				themes: { light: 'github-light', dark: 'github-dark' }
			});
			return `export default ${JSON.stringify(html)};`;
		}
	};
}
