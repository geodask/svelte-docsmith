/**
 * The plugin that compiles markdown doc pages. It runs the markdown compiler
 * (`../markdown.js`) as a Vite transform ahead of vite-plugin-svelte, which
 * then preprocesses and compiles the result like any `.svelte` file. That is
 * why a site never registers a markdown preprocessor itself: the compiler
 * takes its options from `docsmith({ markdown, themes })` and nowhere else.
 *
 * A transform rather than a preprocessor because vite-plugin-svelte 7 removed
 * the hook that let a plugin add one; transforming the file before it is the
 * route it documents for plugins instead.
 */
import type { Plugin } from 'vite';
import type { RenderCodeBlock } from '../code-block.js';
import { markdownCompiler, markdownExtensions, type DocsmithMarkdownOptions } from '../markdown.js';
import type { OutsidePaths } from '../../core/outside-path.js';

/** Vite and vite-plugin-svelte query flags that mean "not the page itself". */
const SKIP_QUERY = ['svelte', 'url', 'raw', 'direct', 'inline', 'worker', 'sharedworker'];

/**
 * Whether `id` asks for a markdown page as a component: one of `extensions`,
 * and not a raw import, a URL, or vite-plugin-svelte's own style request for
 * the compiled page.
 */
export function isMarkdownRequest(id: string, extensions: string[]): boolean {
	const [file, query = ''] = id.split('?', 2);
	if (!extensions.some((ext) => file.endsWith(ext))) return false;
	const params = new URLSearchParams(query);
	return !SKIP_QUERY.some((flag) => params.has(flag));
}

export function markdownPlugin(
	options: DocsmithMarkdownOptions,
	renderCodeBlock: RenderCodeBlock,
	outside: OutsidePaths = [],
	routesDir = ''
): Plugin {
	const extensions = markdownExtensions(options);
	const compile = markdownCompiler(options, renderCodeBlock, outside, routesDir);

	return {
		name: 'docsmith-markdown',
		enforce: 'pre',

		configResolved(config) {
			// SvelteKit only routes, and vite-plugin-svelte only compiles, the
			// extensions in the kit config. Without them a page reaches Vite as
			// Svelte markup in a file it doesn't know, and fails with a parse error
			// that says nothing about why; say why instead.
			const svelte = config.plugins?.find((p) => p.name === 'vite-plugin-svelte:config');
			const known: unknown = (svelte?.api as { options?: { extensions?: unknown } } | undefined)
				?.options?.extensions;
			if (!Array.isArray(known)) return;
			const missing = extensions.filter((ext) => !known.includes(ext));
			if (missing.length) {
				config.logger.warn(
					`[svelte-docsmith] markdown pages use ${missing.map((e) => `'${e}'`).join(', ')}, ` +
						`which SvelteKit doesn't compile. Add them to sveltekit({ extensions }), ` +
						`e.g. extensions: ['.svelte', ${missing.map((e) => `'${e}'`).join(', ')}].`
				);
			}
		},

		transform: {
			// Before vite-plugin-svelte's preprocess step, which is also `pre`,
			// wherever docsmith() sits in the plugin list.
			order: 'pre',
			async handler(code, id) {
				if (!isMarkdownRequest(id, extensions)) return;
				const compiled = await compile(code, id.split('?', 1)[0]);
				if (!compiled) return;
				// mdsvex keeps no map from markdown to the markup it writes; an empty
				// one tells Vite so, rather than warning that one is missing.
				return { code: compiled.code, map: (compiled.map as never) ?? { mappings: '' } };
			}
		}
	};
}
