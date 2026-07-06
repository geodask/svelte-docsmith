import type { DocsmithConfig } from 'svelte-docsmith';
import { version } from 'svelte-docsmith/package.json';

// One config for the whole site — the docs shell, the landing page, and the
// themes page all pass this, so the header/footer stay identical everywhere.
export const siteConfig: DocsmithConfig = {
	title: 'Svelte DocSmith',
	github: 'https://github.com/geodask/svelte-docsmith',
	version,
	nav: [
		{ label: 'Docs', href: '/docs/introduction' },
		{ label: 'Themes', href: '/themes' }
	],
	footer: {
		copyright: '© 2026 George Daskalakis. All rights reserved.',
		columns: [
			{
				title: 'Docs',
				links: [
					{ label: 'Introduction', href: '/docs/introduction' },
					{ label: 'Quick Start', href: '/docs/quick-start' },
					{ label: 'API Reference', href: '/docs/api-reference' }
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
