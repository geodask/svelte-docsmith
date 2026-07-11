<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search';
	import { useSearch } from '$lib/search/context.svelte.js';

	const { class: className = '' }: { class?: string } = $props();

	const search = useSearch();

	// Resolve the modifier label client-side so SSR stays platform-neutral.
	let isMac = $state(false);
	$effect(() => {
		isMac = navigator.platform.toLowerCase().includes('mac');
	});
</script>

{#if search}
	<button
		type="button"
		onclick={() => (search.open = true)}
		class="text-muted-foreground hover:text-foreground border-border/50 bg-muted/40 hover:bg-muted focus-visible:ring-ring inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none {className}"
	>
		<SearchIcon class="size-4 shrink-0" />
		<span class="hidden sm:inline">Search</span>
		<kbd
			class="border-border/60 bg-background text-muted-foreground pointer-events-none ml-2 hidden h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium sm:inline-flex"
		>
			{isMac ? '⌘' : 'Ctrl'}K
		</kbd>
		<span class="sr-only">Search documentation</span>
	</button>
{/if}
