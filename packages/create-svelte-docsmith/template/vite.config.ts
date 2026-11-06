import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { docsmith } from 'svelte-docsmith/vite';
import { docsmith as markdown } from 'svelte-docsmith/preprocess';

export default defineConfig({
	plugins: [
		// `docsmith()` builds the content + search indexes and powers LiveExample.
		// It must come before sveltekit().
		docsmith(),
		tailwindcss(),
		sveltekit({
			// `.md` files are compiled as routes by the DocSmith preprocessor.
			extensions: ['.svelte', '.md'],
			preprocess: [vitePreprocess(), markdown()],
			adapter: adapter()
		})
	]
});
