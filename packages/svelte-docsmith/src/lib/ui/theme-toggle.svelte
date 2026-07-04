<script lang="ts">
	import { Button } from '$lib/ui/shadcn/button/index.js';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { mode, toggleMode } from 'mode-watcher';

	const { class: className }: { class?: string } = $props();
</script>

<Button
	size="icon"
	variant="ghost"
	onclick={toggleMode}
	class="text-muted-foreground hover:text-foreground size-8 {className ?? ''}"
>
	{#if mode.current === 'dark'}
		<Sun class="size-4" />
	{:else}
		<Moon class="size-4" />
	{/if}
	<span class="sr-only">Toggle theme</span>
</Button>
