import { transformerNotationHighlight } from '@shikijs/transformers';
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { escapeSvelte, mdsvex } from 'mdsvex';
import path from 'path';
import { createHighlighter } from 'shiki';
import { fileURLToPath } from 'url';
import rehypeSlug from 'rehype-slug';
import rehypeSectionize from '@hbsnow/rehype-sectionize';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A single highlighter created once, loading a generous set of doc languages.
// Fixes the two flaws PLAN §4 called out in the original setup — the hardcoded
// four-language list and the resulting build-time throws — while keeping
// mdsvex's own `highlight` hook, which receives RAW code. (We tried moving Shiki
// into rehypePlugins per §2.1/§4, but mdsvex escapes `{`->`&#123;` in code
// fences BEFORE rehype runs, so Shiki highlighted the escaped entities. The hook
// is the correct integration point for mdsvex; see §4.5, which flagged this.)
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

const loadedLangs = new Set(highlighter.getLoadedLanguages());

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			// Wrap every .md page in the doc layout, which also maps markdown
			// elements (pre/code/h2/h3) to the svelte-docsmith components.
			// mdsvex injects this path as an import into each compiled .md, so it
			// must be absolute.
			layout: path.join(__dirname, 'src/lib/doc-layout.svelte'),
			highlight: {
				// Shiki highlights the raw code, escapeSvelte makes the result safe to
				// embed, and it renders through the library's <pre> (Components.pre).
				// Unknown languages fall back to plain text instead of throwing.
				highlighter: (code, lang) => {
					const language = lang && loadedLangs.has(lang) ? lang : 'text';
					const html = escapeSvelte(
						highlighter.codeToHtml(code, {
							lang: language,
							themes: { light: 'github-light', dark: 'github-dark' },
							transformers: [transformerNotationHighlight()]
						})
					);
					// Strip Shiki's outer <pre> so the library's <pre> (with the
					// copy-button chrome) provides it instead.
					const inner = html
						.replace(/^<pre[^>]*>/, '')
						.replace(/<\/pre>\s*$/, '')
						.trim();
					return `<Components.pre>{@html \`${inner}\`}</Components.pre>`;
				}
			},
			rehypePlugins: [rehypeSlug, [rehypeSectionize, { idPropertyName: 'data-section-id' }]]
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
