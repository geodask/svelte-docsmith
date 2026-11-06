<script lang="ts">
	import { content } from 'svelte-docsmith/content';
	import { ErrorPage } from 'svelte-docsmith';
	import { siteConfig } from '#lib/site-config.ts';
</script>

<ErrorPage
	config={siteConfig}
	{content}
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	home="/docs/introduction"
	homeLabel="Back to the docs"
/>
