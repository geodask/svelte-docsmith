import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { docsmith } from 'svelte-docsmith/vite';
import { fileURLToPath } from 'node:url';
import pkg from 'svelte-docsmith/package.json' with { type: 'json' };

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
			// The default preset, named anyway so the docs show where a theme is chosen.
			theme: 'darkmatter',
			// One config for the whole site: the docs shell, the landing page, the
			// themes page and the route handlers all read it, so the header and
			// footer stay identical everywhere.
			site: {
				title: 'Svelte DocSmith',
				description:
					'A documentation framework for Svelte. Interactive examples in one real, stateful app, markdown as routes, and a sidebar that builds itself.',
				url: 'https://docsmith.geodask.com',
				editUrl: 'https://github.com/geodask/svelte-docsmith/edit/master/sites/docs',
				github: 'https://github.com/geodask/svelte-docsmith',
				version: pkg.version,
				// Served by src/routes/mcp/+server.ts.
				mcp: '/mcp',
				// Dogfood: the id tracks the library version, so the bar returns after each
				// release (readers who dismissed the last one see the new one) and stays out
				// of the way in between.
				announcement: {
					tag: 'New',
					text: 'Synced tabs and nested sidebar sections.',
					href: '/docs/components/tabs',
					id: pkg.version
				},
				nav: [
					{ label: 'Docs', href: '/docs/introduction' },
					{ label: 'Themes', href: '/themes' },
					{ label: 'Changelog', href: '/changelog' }
				],
				footer: {
					copyright: '© 2026 George Daskalakis. All rights reserved.',
					columns: [
						{
							title: 'Docs',
							links: [
								{ label: 'Introduction', href: '/docs/introduction' },
								{ label: 'Quick Start', href: '/docs/quick-start' },
								{ label: 'Configuration', href: '/docs/configuration' }
							]
						},
						{
							title: 'Explore',
							links: [
								{ label: 'Components', href: '/docs/components/callout' },
								{ label: 'Themes', href: '/themes' }
							]
						},
						{
							title: 'Project',
							links: [
								{
									label: 'GitHub',
									href: 'https://github.com/geodask/svelte-docsmith',
									external: true
								}
							]
						},
						{
							title: 'Built with',
							links: [
								{ label: 'shadcn-svelte', href: 'https://shadcn-svelte.com', external: true },
								{ label: 'Themes based on tweakcn', href: 'https://tweakcn.com/', external: true }
							]
						}
					]
				}
			},
			changelog: { file: '../../packages/svelte-docsmith/CHANGELOG.md' },
			// Versioning is on, with only the current version declared: every page
			// keeps its unprefixed URL and nothing renders differently. The first
			// archive lands when 1.0 ships (`svelte-docsmith archive-version v0`).
			versions: { current: { id: 'v0', label: 'v0.x' } },
			markdown: { twoslash: true }
		}),
		tailwindcss(),
		sveltekit({
			extensions: ['.svelte', '.md'],
			preprocess: [vitePreprocess()],
			adapter: adapter()
		})
	]
});
