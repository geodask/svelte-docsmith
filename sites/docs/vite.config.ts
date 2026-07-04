import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { docsmith } from 'svelte-docsmith/vite';

export default defineConfig({
	plugins: [docsmith(), tailwindcss(), sveltekit()]
});
