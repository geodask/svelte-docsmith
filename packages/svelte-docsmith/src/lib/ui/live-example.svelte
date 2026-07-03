<script lang="ts">
	import { useClipboard } from '$lib/clipboard.svelte.js';
	import { Button } from './shadcn/button/index.js';
	import Check from '@lucide/svelte/icons/check';
	import Code from '@lucide/svelte/icons/code';
	import Copy from '@lucide/svelte/icons/copy';
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
				<Button variant="ghost" size="icon" class="ml-auto size-8" onclick={() => clipboard.copy()}>
					{#if clipboard.copied}
						<Check class="text-emerald-500" />
					{:else}
						<Copy />
					{/if}
				</Button>
			{/if}
		</div>

		{#if showSource}
			<div class="source border-t border-border text-sm" use:clipboard.readText>
				{@html source}
			</div>
		{/if}
	{/if}
</div>

<style>
	.source :global(pre) {
		margin: 0;
		border-radius: 0;
		max-height: 32rem;
		overflow: auto;
	}
</style>
