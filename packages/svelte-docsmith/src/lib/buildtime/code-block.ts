/**
 * The code block renderer: every decision about how a code block is drawn, in
 * one place. A markdown fence and a `?source` import go through the same
 * renderer (one instance per `docsmith()` call, so one set of themes and one
 * Shiki highlighter), so a fence and a LiveExample's source panel can never
 * drift apart.
 *
 * Two steps, kept apart so each can be tested on its own:
 *
 * 1. {@link codeBlockRenderer} turns code, a language and the fence's raw meta
 *    into a {@link CodeBlock}: a diagram, or highlighted HTML with its title
 *    and numbering decided.
 * 2. {@link codeBlockMarkup} and {@link sourcePanelHtml} turn that block into
 *    what each caller embeds. The markup step is the only place that writes
 *    Svelte, and every value goes in as a JavaScript literal, so no title or
 *    code can break out of the markup it lands in.
 *
 * Build-time only: never import this from component code.
 */
import {
	transformerMetaHighlight,
	transformerNotationDiff,
	transformerNotationErrorLevel,
	transformerNotationFocus,
	transformerNotationHighlight,
	transformerNotationWordHighlight
} from '@shikijs/transformers';
import { createHighlighter, type Highlighter, type ShikiTransformer } from 'shiki';
import { hasTwoslash, parseFenceMeta } from './fence-meta.js';
import { twoslashFailure, twoslashTransformer } from './twoslash.js';

/** The default Shiki themes for the dual light/dark render. */
export const DEFAULT_THEMES = { light: 'github-light', dark: 'github-dark' };

/** A generous default language set for documentation code fences. */
export const DEFAULT_LANGS = [
	'javascript',
	'typescript',
	'jsx',
	'tsx',
	'svelte',
	'html',
	'css',
	'json',
	'jsonc',
	'bash',
	'shell',
	'markdown',
	'yaml',
	'toml',
	'python',
	'diff'
];

export type CodeBlockOptions = {
	/** Shiki themes for the dual light/dark render. Default: {@link DEFAULT_THEMES}. */
	themes?: { light: string; dark: string };
	/** Extra Shiki languages to load on top of {@link DEFAULT_LANGS}. */
	langs?: string[];
	/** Number every block whose fence doesn't say otherwise. Default: `false`. */
	lineNumbers?: boolean;
	/** Annotate fences that ask for it with ```ts twoslash. Default: `false`. */
	twoslash?: boolean;
	/** Where a build warning goes. Default: `console.warn`. */
	warn?: (message: string) => void;
};

/** What a block renders as, before it is turned into markup. */
export type CodeBlock =
	| {
			kind: 'diagram';
			/** The diagram's source, for the Mermaid component. */
			code: string;
	  }
	| {
			kind: 'code';
			/** Shiki's whole `<pre>` element, theme surface included. */
			html: string;
			/** Filename or caption shown above the block. */
			title?: string;
			/** Whether to number the lines, with the site default applied. */
			lineNumbers: boolean;
			/** First line's number. Only set when the lines are numbered. */
			startLine?: number;
	  };

/** Render one block: the code, its fence language, and the fence's raw meta. */
export type RenderCodeBlock = (
	code: string,
	lang?: string | null,
	meta?: string | null
) => Promise<CodeBlock>;

/**
 * Comment-driven annotations authors write inside the fence: line highlight,
 * diff (++/--), focus, error/warning, and word highlight. Each strips its own
 * marker comment.
 */
const notation = (): ShikiTransformer[] => [
	// Line ranges from the fence meta (```svelte {4,7-9}). The only way to
	// highlight a line in markup: Shiki's comment markers are not recognised
	// inside a Svelte template region, where an HTML comment is stripped
	// without applying anything.
	transformerMetaHighlight(),
	transformerNotationHighlight(),
	transformerNotationDiff(),
	transformerNotationFocus(),
	transformerNotationErrorLevel(),
	transformerNotationWordHighlight()
];

/**
 * Build a renderer. The Shiki highlighter is created on the first code block
 * and reused after, so a site with no code pays nothing for it.
 */
export function codeBlockRenderer(options: CodeBlockOptions = {}): RenderCodeBlock {
	const themes = options.themes ?? DEFAULT_THEMES;
	const langs = [...new Set([...DEFAULT_LANGS, ...(options.langs ?? [])])];
	const warn = options.warn ?? ((message: string) => console.warn(message));
	let highlighter: Promise<Highlighter> | undefined;

	return async (code, lang, meta) => {
		// A ```mermaid fence renders as a diagram, not highlighted code.
		if (lang === 'mermaid') return { kind: 'diagram', code };

		const shiki = await (highlighter ??= createHighlighter({
			themes: [themes.light, themes.dark],
			langs
		}));
		// An unknown language falls back to plain text instead of failing the build.
		const language = lang && shiki.getLoadedLanguages().includes(lang) ? lang : 'text';
		const render = (extra: ShikiTransformer[] = []) =>
			shiki.codeToHtml(code, {
				lang: language,
				themes,
				// transformerMetaHighlight reads the raw fence meta from here.
				meta: { __raw: meta ?? '' },
				transformers: [...extra, ...notation()]
			});

		let html: string;
		if (options.twoslash && hasTwoslash(meta)) {
			const loaded = await twoslashTransformer();
			if ('error' in loaded) {
				warn(`[svelte-docsmith] ${loaded.error}`);
				html = render();
			} else {
				try {
					html = render([loaded.transformer]);
				} catch (error) {
					// One snippet that doesn't typecheck must not take the site down;
					// fall back to a plain highlight and say which it was.
					warn(
						`[svelte-docsmith] twoslash could not annotate a ${language} block: ` +
							twoslashFailure(error)
					);
					html = render();
				}
			}
		} else {
			html = render();
		}

		const fence = parseFenceMeta(meta);
		const lineNumbers = fence.lineNumbers ?? options.lineNumbers ?? false;
		return {
			kind: 'code',
			html,
			...(fence.title ? { title: fence.title } : {}),
			lineNumbers,
			...(lineNumbers && fence.startLine !== undefined ? { startLine: fence.startLine } : {})
		};
	};
}

/** Shiki's `<pre>` with its own element removed, leaving what goes inside it. */
function innerHtml(html: string): string {
	return html
		.replace(/^<pre[^>]*>/, '')
		.replace(/<\/pre>\s*$/, '')
		.trim();
}

/**
 * The Svelte markup a markdown page embeds for a block.
 *
 * With a layout, code renders through the layout's `Components.pre`, which
 * brings the copy button and title bar, so Shiki's own `<pre>` is dropped.
 * Without one, Shiki's `<pre>` is kept as it is. A diagram's component is
 * dynamic-imported so `mermaid` (an optional peer dependency) is only pulled
 * into pages that use it.
 */
export function codeBlockMarkup(block: CodeBlock, { layout }: { layout: boolean }): string {
	if (block.kind === 'diagram') {
		// The pending branch renders server-side, reserving the diagram's space at
		// first paint so it doesn't shift the page in on load. The client
		// component reuses the same skeleton class until the diagram is ready, so
		// the two never disagree on height.
		return (
			`{#await import('svelte-docsmith/mermaid')}` +
			`<div class="docsmith-mermaid-skeleton not-prose" aria-hidden="true"></div>` +
			`{:then { default: Mermaid }}` +
			`<Mermaid code={${literal(block.code)}} />` +
			`{/await}`
		);
	}
	if (!layout) return `{@html ${literal(block.html)}}`;
	const attrs = [
		block.title !== undefined ? `title={${literal(block.title)}}` : '',
		block.lineNumbers ? 'lineNumbers' : '',
		block.startLine !== undefined ? `startLine={${block.startLine}}` : ''
	]
		.filter(Boolean)
		.join(' ');
	return `<Components.pre${attrs ? ' ' + attrs : ''}>{@html ${literal(innerHtml(block.html))}}</Components.pre>`;
}

/**
 * The HTML a `?source` import exports for a LiveExample's source panel:
 * Shiki's `<pre>` without its own surface (the inline light
 * `background-color` and the `--shiki-dark-bg` var), so the source sits on the
 * component's token background like a markdown code block, and never flashes
 * Shiki's default before the component's CSS applies.
 */
export function sourcePanelHtml(block: CodeBlock): string {
	if (block.kind !== 'code') throw new Error('[svelte-docsmith] a source panel shows code.');
	return block.html
		.replace(/background-color:[^;"]*;?/gi, '')
		.replace(/--shiki-dark-bg:[^;"]*;?/gi, '');
}

/**
 * A string as a JavaScript literal for a Svelte `{expression}`. JSON is valid
 * JavaScript, and the Svelte parser reads an expression with a JavaScript
 * parser, so quotes, braces and backticks inside the value stay text. `<` is
 * escaped too, so the markdown pipeline can never mistake a `</script>` or a
 * tag inside a string for markup of its own.
 */
function literal(value: string): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}
