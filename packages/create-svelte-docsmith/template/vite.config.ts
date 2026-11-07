import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { docsmith } from 'svelte-docsmith/vite';

export default defineConfig({
	plugins: [
		// `docsmith()` is the one place your docs are configured. It compiles the
		// `.md` pages, builds the content and search indexes, and powers
		// LiveExample. It must come before sveltekit().
		docsmith({
			// The site config: what the header, footer and SEO tags show. Every
			// page and route reads it from here. See https://docsmith.geodask.com.
			site: {
				title: '{{SITE_TITLE}}',
				// github: 'https://github.com/you/your-library',
				// description: 'A short tagline, used as the default meta description.',
				// Set `url` to your deployed origin so the sitemap, llms.txt, and social
				// tags emit absolute links.
				// url: 'https://your-docs.dev',
				// Base URL for the "Edit this page" link (points at your repo's docs dir).
				// editUrl: 'https://github.com/you/your-library/edit/main',
				nav: [{ label: 'Docs', href: '/docs/introduction' }],
				footer: {
					copyright: `© ${new Date().getFullYear()} {{SITE_TITLE}}`
				}
			}
		}),
		tailwindcss(),
		sveltekit({
			// SvelteKit routes `.md` files too; docsmith() compiles them.
			extensions: ['.svelte', '.md'],
			preprocess: [vitePreprocess()],
			adapter: adapter()
		})
	]
});
