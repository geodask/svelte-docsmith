<script lang="ts">
	import { useClipboard } from '$lib/clipboard.svelte.js';
	import { Button } from './shadcn/button/index.js';
	import CopyButton from './copy-button.svelte';
	import Code from '@lucide/svelte/icons/code';
	import type { Snippet } from 'svelte';

	const {
		source,
		children
	}: {
		/** Pre-highlighted source HTML (Shiki output), rendered as the source panel. */
		source?: string;
		/** The live, rendered example. */
		children: Snippet;
	} = $props();

	let showSource = $state(false);
	const clipboard = useClipboard();
</script>

<div class="not-prose my-6 overflow-hidden rounded-lg border border-border">
	<div class="flex justify-center bg-muted/30 p-8">
		{@render children()}
	</div>

	{#if source}
		<div class="flex items-center border-t border-border bg-muted/50 px-2 py-1">
			<Button variant="ghost" size="sm" onclick={() => (showSource = !showSource)}>
				<Code class="size-4" />
				{showSource ? 'Hide' : 'Show'} source
			</Button>
			{#if showSource}
				<CopyButton copied={clipboard.copied} onclick={() => clipboard.copy()} class="ml-auto" />
			{/if}
		</div>

		{#if showSource}
			<div class="source bg-muted border-t border-border text-sm" use:clipboard.readText>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted Shiki-highlighted source generated at build time -->
				{@html source}
			</div>
		{/if}
	{/if}
</div>

<style>
	/* Match the markdown code-block treatment: the source sits on `bg-muted`
	   (Shiki's own background is stripped by the `?source` transform) with the
	   same per-line padding. */
	.source :global(pre) {
		margin: 0;
		border-radius: 0;
		max-height: 32rem;
		overflow: auto;
		background: transparent;
	}
	.source :global(pre code) {
		display: block;
		padding-block: 1rem;
	}
	.source :global(pre span.line) {
		display: inline-block;
		width: 100%;
		padding-inline: 1rem;
	}
</style>
