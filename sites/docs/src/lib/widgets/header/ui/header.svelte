<script lang="ts">
	import { version } from '$shared/config/version';
	import Github from '$shared/ui/icons/github.svelte';
	import { Badge } from '$shared/ui/shadcn/badge';
	import { Button } from '$shared/ui/shadcn/button';
	import { Separator } from '$shared/ui/shadcn/separator';
	import * as Sidebar from '$shared/ui/shadcn/sidebar';
	import { Moon, Search, Sun } from '@lucide/svelte';
	import { mode, toggleMode } from 'mode-watcher';
</script>

<header class="flex sticky border-b bg-background z-20 top-0 h-14 shrink-0 items-center gap-2 px-4">
	<Sidebar.Trigger class=" size-9" />
	<Separator orientation="vertical" class="min-h-0 h-6" />

	<Button
		onclick={() => alert('Coming soon!')}
		class="w-64 ml-auto justify-start px-2 border border-border dark:border-input"
		variant="ghost"
	>
		<Search size={16} />
		Search...
	</Button>

	<div class="px-2 font-mono text-sm">v{version}</div>

	<Button
		size="icon"
		variant="ghost"
		target="_blank"
		href="https://github.com/geodask/svelte-docsmith"
	>
		<Github />
	</Button>

	<Button size="icon" variant="ghost" onclick={toggleMode}>
		{#if mode.current === 'dark'}
			<Sun />
		{:else}
			<Moon />
		{/if}
	</Button>
</header>
