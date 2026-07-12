<script lang="ts">
	import type { Snippet } from 'svelte';

	// A numbered walkthrough. Two ways to author it, both work anywhere
	// (markdown pages AND plain .svelte components):
	//
	//   <Steps>
	//     <Step title="First">Do this.</Step>
	//     <Step title="Then">Do that.</Step>
	//   </Steps>
	//
	// Or, as a convenience inside markdown, a plain ordered list:
	//
	//   <Steps>
	//
	//   1. Do this.
	//   2. Do that.
	//
	//   </Steps>
	const { children }: { children: Snippet } = $props();
</script>

<div class="steps">{@render children()}</div>

<style>
	.steps {
		counter-reset: docsmith-step;
	}

	/* Markdown convenience: a plain ordered list renders as numbered steps too.
	   (In a .svelte file there is no mdsvex to produce this <ol>, so prefer
	   <Step> there — this block simply does nothing when no <ol> is present.) */
	.steps :global(ol) {
		counter-reset: docsmith-step;
		list-style: none;
		margin: 1.5rem 0;
		padding: 0;
	}
	.steps :global(ol > li) {
		counter-increment: docsmith-step;
		position: relative;
		margin-left: 0.8rem;
		padding: 0 0 1.5rem 2rem;
		border-left: 1px solid var(--border);
	}
	.steps :global(ol > li:last-child) {
		border-left-color: transparent;
		padding-bottom: 0;
	}
	.steps :global(ol > li)::before {
		content: counter(docsmith-step);
		position: absolute;
		left: 0;
		top: -0.15rem;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 9999px;
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 0.8rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.steps :global(ol > li > :first-child) {
		margin-top: 0;
	}
</style>
