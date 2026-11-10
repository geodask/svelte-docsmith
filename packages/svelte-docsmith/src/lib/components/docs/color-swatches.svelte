<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		children
	}: {
		/** The `ColorSwatch` components to lay out. */
		children: Snippet;
	} = $props();
</script>

<!-- As many columns as fit, like CardGrid. -->
<div class="not-prose my-6 grid gap-x-4 gap-y-5 grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))]">
	{@render children()}
</div>
