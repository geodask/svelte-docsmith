<script lang="ts">
	import { site } from 'svelte-docsmith/site';
	import Breadcrumbs from './breadcrumbs.svelte';
	import CopyPageMenu from './copy-page-menu.svelte';
	import type { PageHeaderProps } from './parts.js';

	// The row above a doc page's content: breadcrumbs, then reading time and the
	// Copy page menu. The archived-version banner above it stays the shell's.
	const { path, breadcrumbs, readingMinutes, since, copyPage }: PageHeaderProps = $props();
</script>

<div class="flex items-start justify-between gap-4">
	<Breadcrumbs items={breadcrumbs} />
	<div class="flex shrink-0 items-center gap-3">
		{#if since}
			<span
				class="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
			>
				Since {since}
			</span>
		{/if}
		{#if readingMinutes}
			<span class="text-muted-foreground text-sm whitespace-nowrap">
				{readingMinutes} min read
			</span>
		{/if}
		{#if copyPage}
			<CopyPageMenu {path} origin={site.url ?? ''} title={site.title} mcp={site.mcp} />
		{/if}
	</div>
</div>
