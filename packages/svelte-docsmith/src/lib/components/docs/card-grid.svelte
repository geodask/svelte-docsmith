<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<!-- Breakpoint-free responsive grid of <Card>s. -->
<div class="not-prose my-6 grid gap-4 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
	{@render children()}
</div>
