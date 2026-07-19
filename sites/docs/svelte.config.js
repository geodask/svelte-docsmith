import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { docsmith } from 'svelte-docsmith/preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [vitePreprocess(), docsmith({ twoslash: true })],
	kit: {
		adapter: adapter()
	}
};

export default config;
