import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { docsmith as docsmithPreprocess } from 'svelte-docsmith/preprocess';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { docsmith } from 'svelte-docsmith/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	resolve: {
		alias: {
			// The package's source, for props imports: the published `dist`
			// strips types out of `.svelte` files, so generated props tables read
			// `$docsmith/components/docs/badge.svelte?props` instead.
			$docsmith: fileURLToPath(new URL('../../packages/svelte-docsmith/src/lib', import.meta.url))
		}
	},
	plugins: [
		docsmith({
			changelog: '../../packages/svelte-docsmith/CHANGELOG.md',
			// Versioning is on, with only the current version declared: every page
			// keeps its unprefixed URL and nothing renders differently. The first
			// archive lands when 1.0 ships (`svelte-docsmith archive-version v0`).
			versions: { current: { id: 'v0', label: 'v0.x' } }
		}),
		tailwindcss(),
		sveltekit({
			extensions: ['.svelte', '.md'],
			preprocess: [vitePreprocess(), docsmithPreprocess({ twoslash: true })],
			adapter: adapter()
		})
	]
});
