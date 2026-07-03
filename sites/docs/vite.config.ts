import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { exampleSource } from './src/lib/vite/example-source.js';

export default defineConfig({
	plugins: [exampleSource(), tailwindcss(), sveltekit()],
	server: {
		fs: {
			allow: ['./.velite']
		}
	}
});
