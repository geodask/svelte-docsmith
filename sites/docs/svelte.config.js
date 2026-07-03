import { transformerNotationHighlight } from '@shikijs/transformers';
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { escapeSvelte, mdsvex } from 'mdsvex';
import { createHighlighter } from 'shiki';
import rehypeSlug from 'rehype-slug';
import rehypeSectionize from '@hbsnow/rehype-sectionize';

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
			// NOTE: the mdsvex layout mapping was removed while there is no markdown
			// content; it gets re-introduced against the svelte-docsmith package's
			// DocPage when real doc pages land (PLAN.md milestone 4).
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
		adapter: adapter()
	}
};

export default config;
