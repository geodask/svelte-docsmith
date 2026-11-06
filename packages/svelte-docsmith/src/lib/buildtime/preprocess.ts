/**
 * `svelte-docsmith/preprocess` — the entire markdown pipeline in one call.
 *
 * This entry runs in Node at config time (registered in `svelte.config.js`,
 * or in `vite.config.js` once SvelteKit 3 consolidates the two — the factory
 * doesn't care where it's registered). It must never import component code.
 */
import rehypeSectionize from '@hbsnow/rehype-sectionize';
import { mdsvex, type MdsvexOptions } from 'mdsvex';
import { fileURLToPath } from 'node:url';
import rehypeSlug from 'rehype-slug';
import type { PreprocessorGroup } from 'svelte/compiler';
import { codeBlockMarkup, codeBlockRenderer } from './code-block.js';

export interface DocsmithPreprocessOptions {
	/** File extensions compiled as markdown. Default: `['.md']`. */
	extensions?: string[];
	/** Shiki themes for the dual light/dark render. Default: github-light/github-dark. */
	themes?: { light: string; dark: string };
	/** Extra Shiki languages to load on top of the defaults. */
	langs?: string[];
	/**
	 * Absolute path to a custom mdsvex layout, or `false` for no layout.
	 * Default: the packaged layout, which wraps pages in a `prose` article and
	 * maps `pre`/`code`/`h2`/`h3` to the svelte-docsmith markdown components.
	 * A custom layout must export a `pre` component from its module script —
	 * code fences render through it (re-export `markdown.pre` if in doubt).
	 */
	layout?: string | false;
	/** Extra remark plugins, appended after docsmith's own. */
	remarkPlugins?: MdsvexOptions['remarkPlugins'];
	/** Extra rehype plugins, appended after docsmith's own (slug, sectionize). */
	rehypePlugins?: MdsvexOptions['rehypePlugins'];
	/**
	 * Number every code block by default. Per-fence `showLineNumbers` /
	 * `noLineNumbers` override it either way. Default: `false`.
	 */
	lineNumbers?: boolean;
	/**
	 * Enable Twoslash on fences that ask for it with ```ts twoslash, adding real
	 * hover types from the TypeScript compiler. Requires the optional peer
	 * dependencies `@shikijs/twoslash`, `twoslash-svelte`, and `typescript`.
	 * A snippet that fails to typecheck falls back to a plain highlight with a
	 * build warning rather than failing the build. Default: `false`.
	 */
	twoslash?: boolean;
}

/**
 * Build the svelte-docsmith preprocessor: mdsvex with Shiki highlighting (via
 * the raw-code `highlight` hook, the correct mdsvex integration point), heading
 * slugs/anchor sections, and the packaged doc layout. Unknown code-fence
 * languages fall back to plain text instead of failing the build.
 */
export function docsmith(options: DocsmithPreprocessOptions = {}): PreprocessorGroup {
	const renderCodeBlock = codeBlockRenderer(options);

	const layout =
		options.layout === false
			? undefined
			: (options.layout ?? fileURLToPath(new URL('./markdown-layout.svelte', import.meta.url)));

	// mdsvex types `markup`'s filename as required where Svelte types it as
	// optional — runtime-compatible (Svelte always passes a filename for real
	// files), but structurally incompatible, hence the cast.
	return mdsvex({
		extensions: options.extensions ?? ['.md'],
		layout,
		highlight: {
			// mdsvex passes the fence's trailing metadata as the third argument,
			// which is where `title=` and the line-number flags come from.
			highlighter: async (code, lang, meta) =>
				codeBlockMarkup(await renderCodeBlock(code, lang, meta), { layout: layout !== undefined })
		},
		remarkPlugins: options.remarkPlugins,
		rehypePlugins: [
			rehypeSlug,
			[rehypeSectionize, { idPropertyName: 'data-section-id' }],
			...(options.rehypePlugins ?? [])
		] as MdsvexOptions['rehypePlugins']
	}) as unknown as PreprocessorGroup;
}
