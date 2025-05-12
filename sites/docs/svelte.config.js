import { transformerNotationHighlight } from '@shikijs/transformers';
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { escapeSvelte, mdsvex } from 'mdsvex';
import path from 'path';
import { createHighlighter } from 'shiki';
import { fileURLToPath } from 'url';
import rehypeSlug from 'rehype-slug';
import rehypeSectionize from '@hbsnow/rehype-sectionize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const highlighter = await createHighlighter({
	themes: ['github-dark', 'github-light'],
	langs: ['javascript', 'typescript', 'svelte', 'bash']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			rehypePlugins: [rehypeSlug, [rehypeSectionize, { idPropertyName: 'data-section-id' }]],
			layout: {
				docPage: path.join(__dirname, './src/lib/shared/ui/layouts/doc-page.svelte')
			},
			highlight: {
				highlighter: async (code, lang) => {
					const html = escapeSvelte(
						highlighter.codeToHtml(code, {
							lang,
							themes: {
								light: 'github-light',
								dark: 'github-dark'
							},
							transformers: [transformerNotationHighlight()]
						})
					);
					// Remove pre tags from the html string
					const formattedHtml = html.replace(/^<pre.*?>/, '').replace(/<\/pre>$/, '');
					return `<Components.pre>{@html \`${formattedHtml.trim()}\`}</Components.pre>`;
				}
			}
		})
	],
	kit: {
		adapter: adapter(),
		alias: {
			$pages: 'src/lib/pages',
			$entities: 'src/lib/entities',
			$features: 'src/lib/features',
			$shared: 'src/lib/shared',
			$widgets: 'src/lib/widgets'
		}
	}
};

export default config;
