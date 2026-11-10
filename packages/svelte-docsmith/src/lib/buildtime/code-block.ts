/**
 * The code block renderer: every decision about how a code block is drawn, in
 * one place. A markdown fence and a `?source` import go through the same
 * renderer (one instance per `docsmith()` call, so one code theme and one
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
import {
	createCssVariablesTheme,
	createHighlighter,
	type Highlighter,
	type ShikiTransformer
} from 'shiki';
import { hasTwoslash, parseFenceMeta } from './fence-meta.js';
import { twoslashFailure, twoslashTransformer } from './twoslash.js';
import {
	installCommands,
	isInstallBlock,
	withoutInstallFlag,
	type PackageManager
} from './install-block.js';

/**
 * The theme a block is coloured with when the site names no `codeTheme`:
 * Shiki's CSS-variables theme, so every colour is a `--code-*` token the site's
 * theme sets (see ADR-0011). Colour mode changes the tokens themselves, so one
 * render serves light and dark, and switching theme recolours code with no
 * rebuild. `theme.css` gives every token a fallback derived from the theme's
 * own colours.
 */
const TOKENS_THEME_NAME = 'docsmith-tokens';
const TOKENS_THEME = createCssVariablesTheme({
	name: TOKENS_THEME_NAME,
	variablePrefix: '--code-',
	fontStyle: true
});

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
	/**
	 * An exact Shiki pair, one per colour mode, rendered dual. Default: none, so
	 * code reads the theme's `--code-*` tokens.
	 */
	codeTheme?: { light: string; dark: string };
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
			/** The fence's language as written, when it names one. */
			language?: string;
			/** Filename or caption shown above the block. */
			title?: string;
			/** Whether to number the lines, with the site default applied. */
			lineNumbers: boolean;
			/** First line's number. Only set when the lines are numbered. */
			startLine?: number;
	  }
	| {
			kind: 'install';
			/** Each manager's commands as a code block, in tab order. */
			blocks: { manager: PackageManager; block: Extract<CodeBlock, { kind: 'code' }> }[];
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
	const pair = options.codeTheme;
	const colours: { themes: { light: string; dark: string } } | { theme: string } = pair
		? { themes: pair }
		: { theme: TOKENS_THEME_NAME };
	const langs = [...new Set([...DEFAULT_LANGS, ...(options.langs ?? [])])];
	const warn = options.warn ?? ((message: string) => console.warn(message));
	let highlighter: Promise<Highlighter> | undefined;

	const renderBlock = async (code: string, lang?: string | null, meta?: string | null) => {
		// A ```mermaid fence renders as a diagram, not highlighted code.
		if (lang === 'mermaid') return { kind: 'diagram', code } as const;

		const shiki = await (highlighter ??= createHighlighter({
			themes: pair ? [pair.light, pair.dark] : [TOKENS_THEME],
			langs
		}));
		// An unknown language falls back to plain text instead of failing the build.
		const language = lang && shiki.getLoadedLanguages().includes(lang) ? lang : 'text';
		const render = (extra: ShikiTransformer[] = []) =>
			shiki.codeToHtml(code, {
				lang: language,
				...colours,
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
			...(lang ? { language: lang } : {}),
			...(fence.title ? { title: fence.title } : {}),
			lineNumbers,
			...(lineNumbers && fence.startLine !== undefined ? { startLine: fence.startLine } : {})
		} as const;
	};

	return async (code, lang, meta) => {
		// ```sh pkg: npm commands, drawn as one tab per package manager.
		if (lang !== 'mermaid' && isInstallBlock(meta)) {
			const rest = withoutInstallFlag(meta);
			const blocks = await Promise.all(
				installCommands(code).map(async ({ manager, code }) => ({
					manager,
					block: (await renderBlock(code, lang, rest)) as Extract<CodeBlock, { kind: 'code' }>
				}))
			);
			return { kind: 'install', blocks };
		}
		return renderBlock(code, lang, meta);
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
	if (block.kind === 'install') {
		const npm = block.blocks.find((entry) => entry.manager === 'npm')!.block;
		if (!layout) return codeBlockMarkup(npm, { layout });
		// A custom layout may not export `install`; it still gets the npm block.
		const tabs = block.blocks.map(({ manager, block: code }) => ({
			manager,
			html: innerHtml(code.html)
		}));
		return (
			`{#if Components.install}` +
			`<Components.install tabs={${literal(tabs)}} ${preAttributes(npm)} />` +
			`{:else}${codeBlockMarkup(npm, { layout })}{/if}`
		);
	}
	if (!layout) return `{@html ${literal(block.html)}}`;
	const attrs = preAttributes(block);
	return `<Components.pre${attrs ? ' ' + attrs : ''}>{@html ${literal(innerHtml(block.html))}}</Components.pre>`;
}

/** The attributes a code block passes to the layout's `pre`. */
function preAttributes(block: Extract<CodeBlock, { kind: 'code' }>): string {
	return [
		block.language !== undefined ? `language={${literal(block.language)}}` : '',
		block.title !== undefined ? `title={${literal(block.title)}}` : '',
		block.lineNumbers ? 'lineNumbers' : '',
		block.startLine !== undefined ? `startLine={${block.startLine}}` : ''
	]
		.filter(Boolean)
		.join(' ');
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
 * A value (a string, or plain data) as a JavaScript literal for a Svelte `{expression}`. JSON is valid
 * JavaScript, and the Svelte parser reads an expression with a JavaScript
 * parser, so quotes, braces and backticks inside the value stay text. `<` is
 * escaped too, so the markdown pipeline can never mistake a `</script>` or a
 * tag inside a string for markup of its own.
 */
export function literal(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}
