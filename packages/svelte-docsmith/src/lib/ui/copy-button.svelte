<script lang="ts">
	import { Button } from '$lib/ui/shadcn/button/index.js';
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import { fade } from 'svelte/transition';

	const {
		copied,
		onclick,
		class: className
	}: {
		/** Whether the copy just succeeded — swaps the icon to a check. */
		copied: boolean;
		onclick: () => void;
		class?: string;
	} = $props();
</script>

<Button {onclick} variant="ghost" size="icon" class="size-8 {className ?? ''}">
	{#if copied}
		<div in:fade={{ duration: 80 }}>
			<Check class="text-emerald-500" />
		</div>
	{:else}
		<div in:fade={{ duration: 200 }}>
			<Copy />
		</div>
	{/if}
	<span class="sr-only">Copy</span>
</Button>
