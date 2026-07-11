<script lang="ts">
	import type { NavItem } from '$lib/config.js';

	const {
		prev,
		next,
		bordered = true
	}: { prev?: NavItem; next?: NavItem; bordered?: boolean } = $props();
</script>

{#if prev || next}
	<nav class="flex justify-between gap-4 {bordered ? 'border-border mt-8 border-t pt-8' : 'mt-6'}">
		{#if prev}
			<a
				href={prev.url}
				class="border-border hover:border-primary flex min-w-0 flex-1 flex-col gap-1 rounded-lg border p-4 transition-colors"
			>
				<span class="text-muted-foreground text-xs">Previous</span>
				<span class="text-foreground truncate font-medium">{prev.title}</span>
			</a>
		{:else}
			<div class="flex-1"></div>
		{/if}
		{#if next}
			<a
				href={next.url}
				class="border-border hover:border-primary ml-auto flex min-w-0 flex-1 flex-col gap-1 rounded-lg border p-4 text-right transition-colors"
			>
				<span class="text-muted-foreground text-xs">Next</span>
				<span class="text-foreground truncate font-medium">{next.title}</span>
			</a>
		{:else}
			<div class="flex-1"></div>
		{/if}
	</nav>
{/if}
