<script lang="ts">
	import { content } from 'svelte-docsmith/content';
	import { DocsShell } from 'svelte-docsmith';
	import { siteConfig } from '#lib/site-config.ts';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<DocsShell
	config={siteConfig}
	{content}
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	pattern
	copyPage
	feedback
>
	{@render children()}
</DocsShell>
