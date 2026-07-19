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
	transformerNotationWordHighlight,
	transformerMetaHighlight
} from '@shikijs/transformers';
import { escapeSvelte, mdsvex, type MdsvexOptions } from 'mdsvex';
import { fileURLToPath } from 'node:url';
import rehypeSlug from 'rehype-slug';
import type { PreprocessorGroup } from 'svelte/compiler';
import { DEFAULT_LANGS, DEFAULT_THEMES, lazyHighlighter } from './highlight.js';
import { parseFenceMeta, hasTwoslash } from './fence-meta.js';
import { twoslashTransformer, twoslashFailure } from './twoslash.js';

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
			// mdsvex passes the fence's trailing metadata as the third argument,
			// which is where `title=` and the line-number flags come from.
			highlighter: async (code, lang, meta) => {
				const fence = parseFenceMeta(meta);
				// A ```mermaid fence renders as a diagram, not highlighted code. The
				// component is dynamic-imported so `mermaid` (an optional peer dep) is
				// only pulled into pages that actually use it; JSON.stringify safely
				// carries the multi-line source into the attribute.
				if (lang === 'mermaid') {
					// The pending branch renders server-side, reserving the diagram's
					// space at first paint so it doesn't shift the page in on load.
					// The client component reuses the same skeleton class until the
					// diagram is ready, so the two never disagree on height.
					return (
						`{#await import('svelte-docsmith/mermaid')}` +
						`<div class="docsmith-mermaid-skeleton not-prose" aria-hidden="true"></div>` +
						`{:then { default: Mermaid }}` +
						`<Mermaid code={${JSON.stringify(code)}} />` +
						`{/await}`
					);
				}
				const highlighter = await getHighlighter();
				const language = lang && highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
				// Comment-driven annotations authors write inside the fence:
				// line highlight, diff (++/--), focus, error/warning, and
				// word highlight. Each strips its own marker comment.
				const notation = [
					// Line ranges from the fence meta (```svelte {4,7-9}). The only way
					// to highlight a line in markup: Shiki's comment markers are not
					// recognised inside a Svelte template region, where an HTML comment
					// is stripped without applying anything.
					transformerMetaHighlight(),
					transformerNotationHighlight(),
					transformerNotationDiff(),
					transformerNotationFocus(),
					transformerNotationErrorLevel(),
					transformerNotationWordHighlight()
				];

				const render = (extra: typeof notation = []) =>
					highlighter.codeToHtml(code, {
						lang: language,
						themes,
						// transformerMetaHighlight reads the raw fence meta from here.
						meta: { __raw: meta ?? '' },
						transformers: [...extra, ...notation]
					});

				let rendered: string;
				if (options.twoslash && hasTwoslash(meta)) {
					const loaded = await twoslashTransformer();
					if ('error' in loaded) {
						console.warn(`[svelte-docsmith] ${loaded.error}`);
						rendered = render();
					} else {
						try {
							rendered = render([loaded.transformer]);
						} catch (error) {
							// One snippet that doesn't typecheck must not take the site
							// down; fall back to a plain highlight and say which it was.
							console.warn(
								`[svelte-docsmith] twoslash could not annotate a ${language} block: ` +
									twoslashFailure(error)
							);
							rendered = render();
						}
					}
				} else {
					rendered = render();
				}

				// escapeSvelte makes the highlighted result safe to embed in a
				// Svelte component.
				const html = escapeSvelte(rendered);
				// Without a layout there is no `Components.pre` to render through —
				// keep Shiki's own <pre> as-is.
				if (layout === undefined) return `{@html \`${html}\`}`;
				// Strip Shiki's outer <pre> so the layout's <pre> component (with
				// the copy-button chrome) provides it instead.
				const inner = html
					.replace(/^<pre[^>]*>/, '')
					.replace(/<\/pre>\s*$/, '')
					.trim();
				const showNumbers = fence.lineNumbers ?? options.lineNumbers ?? false;
				const attrs = [
					fence.title ? `title=${JSON.stringify(fence.title)}` : '',
					showNumbers ? 'lineNumbers' : '',
					showNumbers && fence.startLine !== undefined ? `startLine={${fence.startLine}}` : ''
				]
					.filter(Boolean)
					.join(' ');
				return `<Components.pre${attrs ? ' ' + attrs : ''}>{@html \`${inner}\`}</Components.pre>`;
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
