import { createHighlighter, type Highlighter } from 'shiki';

/**
 * Shared Shiki defaults for the package's two build-time entries
 * (`svelte-docsmith/preprocess` and `svelte-docsmith/vite`), so the doc
 * pipeline and the LiveExample source panels can never drift apart.
 */
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

/**
 * Returns a getter that creates the highlighter on first use and caches it.
 * Build-time only — never import this from component code.
 */
export function lazyHighlighter(themes: string[], langs: string[]): () => Promise<Highlighter> {
	let promise: Promise<Highlighter> | undefined;
	return () => (promise ??= createHighlighter({ themes, langs }));
}
