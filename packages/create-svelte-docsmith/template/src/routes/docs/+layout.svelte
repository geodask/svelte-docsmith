<script lang="ts">
	import { docs } from 'svelte-docsmith/content';
	import { DocsShell } from 'svelte-docsmith';
	import { siteConfig } from '$lib/site-config';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<DocsShell
	config={siteConfig}
	content={docs}
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	pattern
	copyPage
>
	{@render children()}
</DocsShell>
