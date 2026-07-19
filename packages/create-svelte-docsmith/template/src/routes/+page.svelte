<script lang="ts">
	import { docs } from 'svelte-docsmith/content';
	import { DocsShell, Hero, FeatureGrid, Feature, CTA, Action } from 'svelte-docsmith';
	import { siteConfig } from '$lib/site-config';
</script>

<!--
	The landing page in front of your docs. Everything here is ordinary markup, so
	rewrite it freely — or delete this file and add a `+page.ts` that redirects
	straight to /docs/introduction if you'd rather not have one.
-->
<DocsShell config={siteConfig} content={docs} layout="page" pattern>
	<Hero
		title="{{SITE_TITLE}}"
		description="A short line about what your project does and who it's for."
	>
		{#snippet actions()}
			<Action href="/docs/quick-start">Get started</Action>
			<Action href="/docs/introduction" variant="secondary">Read the docs</Action>
		{/snippet}
	</Hero>

	<FeatureGrid
		background="muted"
		title="Everything a docs site needs"
		description="Swap these for the things that matter in your project."
	>
		<Feature title="Markdown routes">
			Pages are markdown files under src/routes/docs/. Add one and it appears.
		</Feature>
		<Feature title="Navigation builds itself">
			The sidebar, breadcrumbs, and prev/next pager all come from page frontmatter.
		</Feature>
		<Feature title="Search included">
			A full-text command palette over your pages, with no service to run.
		</Feature>
		<Feature title="Light and dark">
			Every component and code block follows the theme, and eleven presets ship built in.
		</Feature>
		<Feature title="Ready for AI tools">
			An llms.txt index, per-page Markdown, and a copy button, wired up already.
		</Feature>
		<Feature title="SEO out of the box">
			Titles, meta descriptions, Open Graph tags, and a sitemap, from your frontmatter.
		</Feature>
	</FeatureGrid>

	<CTA
		title="Start writing"
		description="Your first page is a markdown file. That's the whole setup."
	>
		{#snippet actions()}
			<Action href="/docs/quick-start">Quick start</Action>
		{/snippet}
	</CTA>
</DocsShell>
