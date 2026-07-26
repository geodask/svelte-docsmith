<script lang="ts">
	import { docs, versions } from 'svelte-docsmith/content';
	import { DocsShell } from 'svelte-docsmith';
	import { siteConfig } from '$lib/site-config';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<DocsShell
	config={siteConfig}
	content={docs}
	{versions}
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	pattern
	copyPage
	feedback
>
	{@render children()}
</DocsShell>
