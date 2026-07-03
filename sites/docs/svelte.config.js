import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import { transformerNotationHighlight } from '@shikijs/transformers';
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import path from 'path';
import { createHighlighter } from 'shiki';
import { fileURLToPath } from 'url';
import rehypeSlug from 'rehype-slug';
import rehypeSectionize from '@hbsnow/rehype-sectionize';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A single highlighter created once, loading a generous set of doc languages
// up front. We use rehypeShikiFromHighlighter (not @shikijs/rehype's default)
// because the default eager-loads all ~200 bundled grammars, some of which
// fail to resolve under Vite 8 / Rolldown. Unknown languages fall back to
// plain text instead of throwing (PLAN.md §4: no hardcoded 4-language list).
const highlighter = await createHighlighter({
	themes: ['github-light', 'github-dark'],
	langs: [
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
	]
});

// mdsvex's rehypePlugins entries only accept a single options argument, but
// rehypeShikiFromHighlighter needs (highlighter, options). Bind the highlighter
// here so the entry can be the usual [plugin, options] tuple.
const rehypeShiki = (options) => rehypeShikiFromHighlighter(highlighter, options);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			// Disable mdsvex's built-in (prism) highlighter so code fences pass
			// through untouched to rehypeShiki below. Otherwise mdsvex highlights
			// first and rehypeShiki never sees the code blocks.
			highlight: false,
			// Wrap every .md page in the doc layout, which also maps markdown
			// elements (pre/code/h2/h3) to the svelte-docsmith components.
			// mdsvex injects this path as an import into each compiled .md, so it
			// must be absolute.
			layout: path.join(__dirname, 'src/lib/doc-layout.svelte'),
			rehypePlugins: [
				rehypeSlug,
				[rehypeSectionize, { idPropertyName: 'data-section-id' }],
				// Shiki runs on the HAST tree (PLAN.md §4): no string round-trip and
				// no regex-strip of <pre>.
				[
					rehypeShiki,
					{
						themes: { light: 'github-light', dark: 'github-dark' },
						fallbackLanguage: 'text',
						transformers: [transformerNotationHighlight()]
					}
				]
			]
		})
	],
	kit: {
		adapter: adapter(),
		alias: {
			// Generated velite content collections.
			$content: './.velite'
		}
	}
};

export default config;
