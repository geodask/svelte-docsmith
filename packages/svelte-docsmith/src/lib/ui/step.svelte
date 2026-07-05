<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		title,
		children
	}: {
		/** Optional heading for the step. */
		title?: string;
		children?: Snippet;
	} = $props();
</script>

<!--
	One step in a <Steps>. Auto-numbered via a CSS counter shared with the parent,
	so it needs no preprocessor and works in both markdown and plain .svelte.
-->
<div class="step">
	<div class="step-marker" aria-hidden="true"></div>
	<div class="step-content">
		{#if title}<p class="step-title">{title}</p>{/if}
		{#if children}{@render children()}{/if}
	</div>
</div>

<style>
	.step {
		counter-increment: docsmith-step;
		position: relative;
		padding: 0 0 1.5rem 2.5rem;
	}
	/* Connector line, centered under the badge, sitting behind it (z-index) so
	   it never cuts across the number; hidden on the last step. */
	.step::after {
		content: '';
		position: absolute;
		left: 0.8rem;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--border);
		z-index: 0;
	}
	.step:last-child {
		padding-bottom: 0;
	}
	.step:last-child::after {
		display: none;
	}
	.step-marker {
		position: absolute;
		left: 0;
		top: -0.15rem;
		z-index: 1;
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
		/* Ring in the page bg so the connector visually stops at the badge edge. */
		box-shadow: 0 0 0 4px var(--background);
	}
	.step-marker::before {
		content: counter(docsmith-step);
	}
	.step-title {
		margin: 0 0 0.4rem;
		font-weight: 600;
	}
	.step-content :global(:first-child) {
		margin-top: 0;
	}
	.step-content :global(:last-child) {
		margin-bottom: 0;
	}
</style>
