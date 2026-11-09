<script lang="ts">
	import { content } from 'svelte-docsmith/content';
	import { DocsShell } from 'svelte-docsmith';
	import { trackFeedback } from '#lib/analytics.ts';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<DocsShell
	{content}
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	pattern
	copyPage
	feedback={trackFeedback}
>
	{@render children()}
</DocsShell>
