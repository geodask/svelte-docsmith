<script lang="ts">
	import { Button } from '$lib/ui/shadcn/button/index.js';
	import { Separator } from '$lib/ui/shadcn/separator/index.js';
	import * as Sidebar from '$lib/ui/shadcn/sidebar/index.js';
	import GithubIcon from '$lib/ui/icons/github.svelte';
	import type { DocsmithConfig } from '$lib/config.js';
	import Moon from '@lucide/svelte/icons/moon';
	import Search from '@lucide/svelte/icons/search';
	import Sun from '@lucide/svelte/icons/sun';
	import { mode, toggleMode } from 'mode-watcher';

	const { config }: { config: DocsmithConfig } = $props();
</script>

<header class="flex sticky border-b bg-background z-20 top-0 h-14 shrink-0 items-center gap-2 px-4">
	<Sidebar.Trigger class="size-9" />
	<Separator orientation="vertical" class="min-h-0 h-6" />

	<Button
		onclick={() => alert('Coming soon!')}
		class="w-64 ml-auto justify-start px-2 border border-border dark:border-input"
		variant="ghost"
	>
		<Search size={16} />
		Search...
	</Button>

	{#if config.version}
		<div class="px-2 font-mono text-sm">v{config.version}</div>
	{/if}

	{#if config.github}
		<Button size="icon" variant="ghost" target="_blank" href={config.github}>
			<GithubIcon />
		</Button>
	{/if}

	<Button size="icon" variant="ghost" onclick={toggleMode}>
		{#if mode.current === 'dark'}
			<Sun />
		{:else}
			<Moon />
		{/if}
	</Button>
</header>
