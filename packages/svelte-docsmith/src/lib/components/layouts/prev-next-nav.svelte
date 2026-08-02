<script lang="ts">
	import type { NavItem } from '$lib/core/index.js';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	const {
		prev,
		next,
		bordered = true
	}: { prev?: NavItem; next?: NavItem; bordered?: boolean } = $props();
</script>

{#if prev || next}
	<nav
		aria-label="Pagination"
		class="flex justify-between gap-4 {bordered ? 'border-border mt-8 border-t pt-8' : 'mt-6'}"
	>
		{#if prev}
			<a
				href={prev.url}
				class="border-border hover:border-primary/60 hover:bg-primary/5 group flex min-w-0 flex-1 flex-col gap-1 rounded-lg border p-4 transition-colors"
			>
				<span
					class="text-muted-foreground group-hover:text-primary flex items-center gap-1 text-xs"
				>
					<ChevronLeft class="size-3.5" aria-hidden="true" />
					Previous
				</span>
				<span class="text-foreground truncate font-medium">{prev.title}</span>
			</a>
		{:else}
			<div class="flex-1"></div>
		{/if}
		{#if next}
			<a
				href={next.url}
				class="border-border hover:border-primary/60 hover:bg-primary/5 group ml-auto flex min-w-0 flex-1 flex-col items-end gap-1 rounded-lg border p-4 text-right transition-colors"
			>
				<span
					class="text-muted-foreground group-hover:text-primary flex items-center gap-1 text-xs"
				>
					Next
					<ChevronRight class="size-3.5" aria-hidden="true" />
				</span>
				<span class="text-foreground truncate font-medium">{next.title}</span>
			</a>
		{:else}
			<div class="flex-1"></div>
		{/if}
	</nav>
{/if}
