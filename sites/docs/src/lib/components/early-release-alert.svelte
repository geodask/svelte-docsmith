<script lang="ts">
	import { Callout } from 'svelte-docsmith';
</script>

<!-- Uses the package Callout so the pre-1.0 note follows the same warning
     tokens as every other caution in the docs — not a one-off yellow hex. -->
<div class="early-release">
	<Callout variant="warning" title="Development in progress">
		<p>
			The library is currently in active development. Each minor release may contain breaking
			changes until it reaches a stable v1.0 release.
		</p>
	</Callout>
</div>

<style>
	/* Sit flush when composed above a CTA so it reads as a footnote, not a
	   second section with its own vertical rhythm. */
	.early-release :global(.callout) {
		margin: 0;
	}
</style>
