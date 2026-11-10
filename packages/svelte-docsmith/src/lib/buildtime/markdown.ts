/**
 * The markdown pipeline: mdsvex with the shared code block renderer, heading
 * slugs and anchor sections, and the packaged doc layout. The `docsmith()`
 * Vite plugin runs it on every markdown file before vite-plugin-svelte sees
 * the file (see `./vite/markdown.ts`), so it takes its options from the one
 * `docsmith({ markdown })` call and is never registered by hand.
 *
 * Runs in Node at build time. It must never import component code.
 */
import rehypeSectionize from '@hbsnow/rehype-sectionize';
import { mdsvex, type MdsvexOptions } from 'mdsvex';
import { fileURLToPath } from 'node:url';
import rehypeSlug from 'rehype-slug';
import { codeBlockMarkup, type RenderCodeBlock } from './code-block.js';
import type { OutsidePaths } from '../core/outside-path.js';
import { rehypeOutsidePaths } from './outside-paths.js';
import { rehypeImages } from './images.js';
import { rehypeMath, remarkMathPlugin } from './math.js';

/** The `markdown` options of `docsmith()`: how doc pages are compiled. */
export interface DocsmithMarkdownOptions {
	/**
	 * File extensions compiled as markdown. Default: `['.md']`. SvelteKit must
	 * route them too, so list the same extensions in its `extensions`.
	 */
	extensions?: string[];
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
	/**
	 * Extra rehype plugins, appended after docsmith's own (slug, sectionize, and
	 * `rel="external"` on links to outside paths).
	 */
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
	/**
	 * Render `$…$` as an inline formula and `$$…$$` as a display formula, written
	 * as MathML at build time. A single `$` opens a formula only when no space
	 * follows it, so "$5 or $10" stays text; write `\$` for a literal dollar.
	 * Requires the optional peer dependency `temml`. Default: `false`.
	 */
	math?: boolean;
}

/**
 * The file extensions compiled as markdown: the author's, or `['.md']`. One
 * default for every pass that has to agree on which files are doc pages: the
 * compiler, the plugin that runs it, and the broken-link check's route list.
 */
export function markdownExtensions(options: DocsmithMarkdownOptions): string[] {
	return options.extensions ?? ['.md'];
}

/** Compile one markdown file to Svelte markup, or `undefined` if it isn't one. */
export type CompileMarkdown = (
	content: string,
	filename: string
) => Promise<{ code: string; map?: unknown } | undefined>;

/**
 * Build the markdown compiler over a code block renderer. The renderer is
 * passed in rather than built here so a site's fences and its `?source`
 * panels share one renderer, and with it one set of themes and one Shiki
 * highlighter.
 *
 * `outside` names the outside paths whose links compile with `rel="external"`,
 * and `routesDir`, the absolute routes root, gives each page the URL its
 * relative links resolve against. Without outside paths, no link is marked.
 */
export function markdownCompiler(
	options: DocsmithMarkdownOptions,
	renderCodeBlock: RenderCodeBlock,
	outside: OutsidePaths = [],
	routesDir = ''
): CompileMarkdown {
	const layout =
		options.layout === false
			? undefined
			: (options.layout ?? fileURLToPath(new URL('./markdown-layout.svelte', import.meta.url)));

	const group = mdsvex({
		extensions: markdownExtensions(options),
		layout,
		highlight: {
			// mdsvex passes the fence's trailing metadata as the third argument,
			// which is where `title=` and the line-number flags come from.
			highlighter: async (code, lang, meta) =>
				codeBlockMarkup(await renderCodeBlock(code, lang, meta), { layout: layout !== undefined })
		},
		remarkPlugins: [
			...(options.math ? [remarkMathPlugin] : []),
			...(options.remarkPlugins ?? [])
		] as MdsvexOptions['remarkPlugins'],
		rehypePlugins: [
			rehypeSlug,
			// After the slugs, so a heading's formula counts as its TeX text, as
			// the table of contents reads it.
			...(options.math ? [rehypeMath((message) => console.warn(message))] : []),
			[rehypeSectionize, { idPropertyName: 'data-section-id' }],
			rehypeOutsidePaths(outside, routesDir),
			// Figures only where the packaged layout draws images: a custom layout
			// may not, and a lifted image would lose its paragraph for nothing.
			rehypeImages({ figures: options.layout === undefined }),
			...(options.rehypePlugins ?? [])
		] as MdsvexOptions['rehypePlugins']
	});

	return async (content, filename) => {
		const result = await group.markup?.({ content, filename });
		return result ? { code: result.code, map: result.map } : undefined;
	};
}
