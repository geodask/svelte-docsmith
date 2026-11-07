/**
 * The plugin shape the `?source` and `?props` transforms share. An import of
 * `Component.svelte?<query>` resolves, the way Vite resolves the component
 * itself, to a virtual id carrying the component's file; loading that id asks
 * the transform for the component's module. The id must not end in `.svelte`,
 * or vite-plugin-svelte would try to compile the module as a component.
 */
import type { Plugin } from 'vite';
import type { PropsHook } from '../props/reader.js';

/** Which build-time transform a page import goes through. */
export type DocImportQuery = 'source' | 'props';

/** What a transform may do from its load hook: Rollup's plugin context has both. */
export type DocImportHook = PropsHook;

/** A transform: the component file in, the module's code out. */
export type DocImportLoad = (file: string, hook: DocImportHook) => Promise<string>;

export function docImportPlugin(name: string, query: DocImportQuery, load: DocImportLoad): Plugin {
	const suffix = `.svelte?${query}`;
	const prefix = `\0docsmith-${query}:`;
	const ext = `.docsmith-${query}`;
	return {
		name,
		enforce: 'pre',

		async resolveId(id, importer) {
			if (!id.endsWith(suffix)) return;
			const component = id.slice(0, -`?${query}`.length);
			const resolved = await this.resolve(component, importer, { skipSelf: true });
			if (resolved) return prefix + resolved.id + ext;
		},

		async load(id) {
			if (!id.startsWith(prefix) || !id.endsWith(ext)) return;
			return load(id.slice(prefix.length, -ext.length), this);
		}
	};
}
