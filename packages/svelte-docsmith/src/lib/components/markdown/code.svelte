<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<code
	class="not-prose bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
>
	{@render children()}
</code>
