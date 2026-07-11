import type { DocsmithConfig } from 'svelte-docsmith';

// The whole-site config passed to DocsShell. Set your title, links, and the
// SEO/social defaults here. See https://docsmith.geodask.com.
export const siteConfig: DocsmithConfig = {
	title: '{{SITE_TITLE}}',
	// github: 'https://github.com/you/your-library',
	// description: 'A short tagline, used as the default meta description.',
	// url: 'https://your-docs.dev',
	nav: [{ label: 'Docs', href: '/docs/introduction' }],
	footer: {
		copyright: `© ${new Date().getFullYear()} {{SITE_TITLE}}`
	}
};
