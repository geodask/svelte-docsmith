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

<div class="docsmith-columns" class:docsmith-columns-3={cols === 3}>
	{@render children()}
</div>

<style>
	/* One column on phones. */
	.docsmith-columns {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.5rem;
		margin: 1.5rem 0;
	}
	@media (min-width: 40rem) {
		.docsmith-columns {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.docsmith-columns-3 {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
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
