import type { DocsmithConfig } from 'svelte-docsmith';
import { version } from 'svelte-docsmith/package.json';

// One config for the whole site: the docs shell, the landing page, and the
// themes page all pass this, so the header/footer stay identical everywhere.
export const siteConfig: DocsmithConfig = {
	title: 'Svelte DocSmith',
	description:
		'A documentation framework for Svelte. Interactive examples in one real, stateful app, markdown as routes, and a sidebar that builds itself.',
	url: 'https://docsmith.geodask.com',
	editUrl: 'https://github.com/geodask/svelte-docsmith/edit/master/sites/docs',
	github: 'https://github.com/geodask/svelte-docsmith',
	version,
	// Dogfood: the id tracks the library version, so the bar returns after each
	// release (readers who dismissed the last one see the new one) and stays out
	// of the way in between.
	announcement: {
		tag: 'New',
		text: 'Synced tabs and nested sidebar sections.',
		href: '/docs/components/tabs',
		id: version
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
					{ label: 'GitHub', href: 'https://github.com/geodask/svelte-docsmith', external: true }
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
};
