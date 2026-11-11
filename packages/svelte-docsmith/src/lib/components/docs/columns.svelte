<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		cols = 2,
		children
	}: {
		/** How many columns to lay out, from the small breakpoint up. */
		cols?: 2 | 3;
		/**
		 * The columns, one per child element. Wrap markdown in a `<div>` to
		 * keep several paragraphs in one column.
		 */
		children: Snippet;
	} = $props();
</script>

<!-- One column on phones; the site's own sm breakpoint and up, side by side. -->
<div
	class="docsmith-columns my-6 grid grid-cols-1 gap-6 {cols === 3
		? 'docsmith-columns-3 sm:grid-cols-3'
		: 'sm:grid-cols-2'}"
>
	{@render children()}
</div>

<style>
	/* Each child is a column. Its own margins would sit inside the grid cell
	   and push it out of line with its neighbours. */
	.docsmith-columns > :global(*) {
		margin-block: 0;
	}
	.docsmith-columns > :global(*) > :global(:first-child) {
		margin-top: 0;
	}
	.docsmith-columns > :global(*) > :global(:last-child) {
		margin-bottom: 0;
	}
</style>
