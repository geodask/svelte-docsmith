import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { exampleSource } from 'svelte-docsmith/vite';

export default defineConfig({
	plugins: [exampleSource(), tailwindcss(), sveltekit()],
	server: {
		fs: {
			allow: ['./.velite']
		}
	}
});
