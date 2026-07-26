import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { docsmith } from 'svelte-docsmith/vite';

export default defineConfig({
	plugins: [
		docsmith({
			changelog: '../../packages/svelte-docsmith/CHANGELOG.md',
			// Versioning is on, with only the current version declared: every page
			// keeps its unprefixed URL and nothing renders differently. The first
			// archive lands when 1.0 ships (`svelte-docsmith archive-version v0`).
			versions: { current: { id: 'v0', label: 'v0.x' } }
		}),
		tailwindcss(),
		sveltekit()
	]
});
