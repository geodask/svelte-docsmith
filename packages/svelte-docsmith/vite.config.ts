import { svelteTesting } from '@testing-library/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		passWithNoTests: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			// Gate only the framework-agnostic logic + runes stores — the pieces
			// with real branches worth protecting. Presentational `.svelte`
			// components and the vendored shadcn primitives are covered by usage,
			// not unit tests, and would only dilute the threshold.
			include: [
				'src/lib/config.ts',
				'src/lib/vite.ts',
				'src/lib/preprocess.ts',
				'src/lib/highlight.ts',
				'src/lib/clipboard.svelte.ts',
				'src/lib/search/create-search.ts',
				'src/lib/search/snippet.ts',
				'src/lib/sitemap.ts',
				'src/lib/generate-llms.ts',
				'src/lib/normalize-path.ts',
				'src/lib/toc/from-content.ts',
				'src/lib/toc/toc.svelte.ts'
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
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
