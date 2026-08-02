<script lang="ts">
	import { Button } from '$lib/components/shadcn/button/index.js';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { mode, toggleMode } from 'mode-watcher';

	const { class: className }: { class?: string } = $props();

	// Label names the destination mode so the control is self-describing for
	// assistive tech and matches what the icon shows (sun = go light, moon = go dark).
	const label = $derived(mode.current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
</script>

<Button
	size="icon"
	variant="ghost"
	onclick={toggleMode}
	aria-label={label}
	class="text-muted-foreground hover:text-foreground size-8 {className ?? ''}"
>
	{#if mode.current === 'dark'}
		<Sun class="size-4" />
	{:else}
		<Moon class="size-4" />
	{/if}
</Button>
