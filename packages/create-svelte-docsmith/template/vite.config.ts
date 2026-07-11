import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { docsmith } from 'svelte-docsmith/vite';

export default defineConfig({
	// `docsmith()` builds the content + search indexes and powers LiveExample.
	// It must come before sveltekit().
	plugins: [docsmith(), tailwindcss(), sveltekit()]
});
