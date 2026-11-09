import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	plugins: [
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess(),

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	],
	test: {
		passWithNoTests: true,
		// The docsmith() plugin serves these modules in a real site. Under test
		// they resolve to the checked-in fallbacks (not `dist`, which may not be
		// built yet); a test that renders the shell mocks the site, and one that
		// checks reader events mocks the handler.
		alias: {
			'svelte-docsmith/site': fileURLToPath(
				new URL('./src/lib/fallbacks/site.ts', import.meta.url)
			),
			'svelte-docsmith/reader-events': fileURLToPath(
				new URL('./src/lib/fallbacks/reader-events.ts', import.meta.url)
			)
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			// Gate only the framework-agnostic logic + runes stores — the pieces
			// with real branches worth protecting. Presentational `.svelte`
			// components and the vendored shadcn primitives are covered by usage,
			// not unit tests, and would only dilute the threshold.
			include: [
				'src/lib/core/config.ts',
				'src/lib/core/nav.ts',
				'src/lib/core/version.ts',
				'src/lib/core/docs-page.ts',
				'src/lib/components/docs/playground.svelte.ts',
				'src/lib/buildtime/vite/**/*.ts',
				'src/lib/buildtime/props/**/*.ts',
				'src/lib/utils/type-text.ts',
				'src/lib/buildtime/archive.ts',
				'src/lib/buildtime/git.ts',
				'src/lib/buildtime/markdown.ts',
				'src/lib/buildtime/code-block.ts',
				'src/lib/utils/clipboard.svelte.ts',
				'src/lib/utils/url.ts',
				'src/lib/search/create-search.ts',
				'src/lib/search/session.svelte.ts',
				'src/lib/search/snippet.ts',
				'src/lib/generate/sitemap.ts',
				'src/lib/generate/llms.ts',
				'src/lib/generate/feed.ts',
				'src/lib/generate/xml.ts',
				'src/lib/mcp/handler.ts',
				'src/lib/mcp/tools.ts',
				'src/lib/server/routes.ts',
				'src/lib/buildtime/paths.ts',
				'src/lib/toc/from-content.ts',
				'src/lib/toc/toc.svelte.ts',
				'src/lib/components/docs/tabs-sync.svelte.ts'
			],
			thresholds: {
				statements: 92,
				branches: 85,
				functions: 95,
				lines: 95
			}
		},
		projects: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					// scripts/ holds repo tooling (the theme preset manifest) that is
					// tested here but not packaged.
					include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.test.js'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
