/**
 * `svelte-docsmith/preprocess` — the entire markdown pipeline in one call.
 *
 * This entry runs in Node at config time (registered in `svelte.config.js`,
 * or in `vite.config.js` once SvelteKit 3 consolidates the two — the factory
 * doesn't care where it's registered). It must never import component code.
 */
import rehypeSectionize from '@hbsnow/rehype-sectionize';
import {
	transformerNotationDiff,
	transformerNotationErrorLevel,
	transformerNotationFocus,
	transformerNotationHighlight,
	transformerNotationWordHighlight
} from '@shikijs/transformers';
import { escapeSvelte, mdsvex, type MdsvexOptions } from 'mdsvex';
import { fileURLToPath } from 'node:url';
import rehypeSlug from 'rehype-slug';
import type { PreprocessorGroup } from 'svelte/compiler';
import { DEFAULT_LANGS, DEFAULT_THEMES, lazyHighlighter } from './highlight.js';

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
}

/**
 * Build the svelte-docsmith preprocessor: mdsvex with Shiki highlighting (via
 * the raw-code `highlight` hook, the correct mdsvex integration point), heading
 * slugs/anchor sections, and the packaged doc layout. Unknown code-fence
 * languages fall back to plain text instead of failing the build.
 */
export function docsmith(options: DocsmithPreprocessOptions = {}): PreprocessorGroup {
	const themes = options.themes ?? DEFAULT_THEMES;
	const langs = [...new Set([...DEFAULT_LANGS, ...(options.langs ?? [])])];
	const getHighlighter = lazyHighlighter([themes.light, themes.dark], langs);

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
			highlighter: async (code, lang) => {
				const highlighter = await getHighlighter();
				const language = lang && highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
				// Shiki highlights the raw code; escapeSvelte makes the result safe
				// to embed in a Svelte component.
				const html = escapeSvelte(
					highlighter.codeToHtml(code, {
						lang: language,
						themes,
						// Comment-driven annotations authors write inside the fence:
						// line highlight, diff (++/--), focus, error/warning, and
						// word highlight. Each strips its own marker comment.
						transformers: [
							transformerNotationHighlight(),
							transformerNotationDiff(),
							transformerNotationFocus(),
							transformerNotationErrorLevel(),
							transformerNotationWordHighlight()
						]
					})
				);
				// Without a layout there is no `Components.pre` to render through —
				// keep Shiki's own <pre> as-is.
				if (layout === undefined) return `{@html \`${html}\`}`;
				// Strip Shiki's outer <pre> so the layout's <pre> component (with
				// the copy-button chrome) provides it instead.
				const inner = html
					.replace(/^<pre[^>]*>/, '')
					.replace(/<\/pre>\s*$/, '')
					.trim();
				return `<Components.pre>{@html \`${inner}\`}</Components.pre>`;
			}
		},
		remarkPlugins: options.remarkPlugins,
		rehypePlugins: [
			rehypeSlug,
			[rehypeSectionize, { idPropertyName: 'data-section-id' }],
			...(options.rehypePlugins ?? [])
		] as MdsvexOptions['rehypePlugins']
	}) as unknown as PreprocessorGroup;
}
