/**
 * Doc imports: the `Component.svelte?source` and `Component.svelte?props`
 * imports a doc page makes for `<LiveExample source={…}>` and
 * `<PropsTable of={…}>`. Each kind is one module with two sides:
 *
 *  - the **page side**, the module the import loads as on the rendered page
 *    (highlighted source, extracted props as JSON), and
 *  - the **agent side**, what replaces its tag in agent markdown (a fenced
 *    block of the source, a markdown props table).
 *
 * The Vite plugin and agent markdown each loop over {@link DOC_IMPORT_KINDS};
 * neither names a kind. Adding one is a module here and a line in that list.
 */
import type { Plugin } from 'vite';
import type { ExtractedProps } from '../../../core/extracted-props.js';
import type { RenderCodeBlock } from '../../code-block.js';
import type { PropsHook, PropsReader } from '../../props/reader.js';
import { propsImport } from './props.js';
import { sourceImport } from './source.js';

/** What each kind's agent side reads, by the query that selects the kind. */
export type DocImportValues = {
	source: string;
	props: ExtractedProps;
};

/** The query after `.svelte?` that selects a kind. */
export type DocImportQuery = keyof DocImportValues;

/** What a kind may do from inside a plugin hook: Rollup's plugin context has both. */
export type DocImportHook = PropsHook;

/** What the kinds read through, shared by every doc import of a `docsmith()` call. */
export type DocImportDeps = {
	/** The code block renderer markdown fences use, for `?source` panels. */
	render: RenderCodeBlock;
	/** The props reader the llms index shares. */
	props: PropsReader;
};

/** Where a tag sits in agent markdown, for the kind writing it out. */
export type TagSite = {
	/** The tag's attributes as written, for any besides the import's own. */
	attributes: string;
	/** The tag's indentation, to put before each line written in its place. */
	indent: string;
	/** The level of the heading the tag sits under: 1 under the page title. */
	level: number;
};

export interface DocImportKind<Q extends DocImportQuery = DocImportQuery> {
	query: Q;
	/** Page side: the code of the module `Component.svelte?<query>` loads as. */
	module(file: string, hook: DocImportHook, deps: DocImportDeps): Promise<string>;
	/**
	 * Agent side: what the tag is written out from, or `undefined` when the
	 * file can't be read. Watches what it read beyond `file` itself.
	 */
	read(
		file: string,
		hook: DocImportHook,
		deps: DocImportDeps
	): Promise<DocImportValues[Q] | undefined>;
	/** The component whose tag agent markdown writes out, and the attribute that takes the import. */
	tag: string;
	attribute: string;
	/** Agent side: the markdown that replaces one tag. */
	write(value: DocImportValues[Q], site: TagSite): string;
}

export const DOC_IMPORT_KINDS: readonly DocImportKind[] = [sourceImport, propsImport];

/**
 * Agent side reads for every kind, by query: what agent markdown's host hands
 * it. A host in a test returns literals, sync or not.
 */
export type DocImportReads = {
	[Q in DocImportQuery]: (
		file: string
	) => DocImportValues[Q] | undefined | Promise<DocImportValues[Q] | undefined>;
};

/** The agent side reads for every kind, from inside `hook`. */
export function docImportReads(deps: DocImportDeps, hook: DocImportHook): DocImportReads {
	return Object.fromEntries(
		DOC_IMPORT_KINDS.map((kind) => [kind.query, (file: string) => kind.read(file, hook, deps)])
	) as DocImportReads;
}

/**
 * The page side of every kind as one Vite plugin. An import of
 * `Component.svelte?<query>` resolves, the way Vite resolves the component
 * itself, to a virtual id carrying the kind and the component's file; loading
 * that id asks the kind for the module. The id must not end in `.svelte`, or
 * vite-plugin-svelte would try to compile the module as a component.
 */
export function docImportsPlugin(deps: DocImportDeps): Plugin {
	const idFor = (kind: DocImportKind, file: string) =>
		`\0docsmith-${kind.query}:${file}.docsmith-${kind.query}`;
	const fileOf = (kind: DocImportKind, id: string) => {
		const prefix = `\0docsmith-${kind.query}:`;
		const ext = `.docsmith-${kind.query}`;
		return id.startsWith(prefix) && id.endsWith(ext)
			? id.slice(prefix.length, -ext.length)
			: undefined;
	};
	return {
		name: 'docsmith-doc-imports',
		enforce: 'pre',

		// The one place the props reader learns the root: `docsmith()` returns
		// this plugin with the content plugin, whose llms index reads through
		// the same reader, and every `configResolved` runs before any `load`.
		configResolved(config) {
			deps.props.configure(config.root);
		},

		async resolveId(id, importer) {
			const kind = DOC_IMPORT_KINDS.find((k) => id.endsWith(`.svelte?${k.query}`));
			if (!kind) return;
			const component = id.slice(0, -`?${kind.query}`.length);
			const resolved = await this.resolve(component, importer, { skipSelf: true });
			if (resolved) return idFor(kind, resolved.id);
		},

		async load(id) {
			for (const kind of DOC_IMPORT_KINDS) {
				const file = fileOf(kind, id);
				if (file !== undefined) return kind.module(file, this, deps);
			}
		}
	};
}
