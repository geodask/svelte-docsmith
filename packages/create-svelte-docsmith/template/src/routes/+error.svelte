<script lang="ts">
	import { docs } from 'svelte-docsmith/content';
	import { ErrorPage } from 'svelte-docsmith';
	import { siteConfig } from '$lib/site-config';
</script>

<ErrorPage
	config={siteConfig}
	content={docs}
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	home="/docs/introduction"
	homeLabel="Back to the docs"
/>
