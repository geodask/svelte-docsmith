<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<kbd
	class="border-border bg-muted text-muted-foreground inline-flex min-w-[1.6em] items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-[0.75em] leading-none font-medium shadow-sm"
>
	{@render children()}
</kbd>
