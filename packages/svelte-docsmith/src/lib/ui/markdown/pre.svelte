<script lang="ts">
	import { useClipboard } from '$shared/lib/clipboard.svelte';
	import type { Snippet } from 'svelte';
	import { ScrollArea } from '../shadcn/scroll-area';

	import { Check, Copy } from '@lucide/svelte';
	import { Button } from '../shadcn/button';
	import { fade } from 'svelte/transition';

	const clipboard = useClipboard();

	const { children }: { children: Snippet } = $props();
</script>

<div class="rounded-md overflow-hidden bg-muted mt-2 shadow-md text-sm relative">
	<!-- <div class="flex items-center pl-2 sticky left-0 top-0 bg-muted border-b p-1">
		<code>+page.svelte</code>
		<Button variant="ghost" size="icon" class="size-8 ml-auto">
			<Copy />
		</Button>
	</div> -->
	<ScrollArea orientation="both" class="relative">
		<Button
			onclick={() => clipboard.copy()}
			variant="ghost"
			size="icon"
			class="size-8 z-10 absolute bg-muted right-2 top-2"
		>
			{#if clipboard.copied}
				<div in:fade={{ duration: 80 }}>
					<Check class="text-emerald-500" />
				</div>
			{:else}
				<div in:fade={{ duration: 200 }}>
					<Copy />
				</div>
			{/if}
		</Button>

		<pre class="not-prose shiki max-h-[32rem] flex shrink" use:clipboard.readText>
			{@render children()}
		</pre>

		<!-- Scroll indicators with increased fade intensity -->
		<div
			class="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-muted via-muted/70 to-transparent pointer-events-none"
			aria-hidden="true"
		></div>
		<div
			class="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-muted via-muted/70 to-transparent pointer-events-none"
			aria-hidden="true"
		></div>
		<div
			class="absolute top-0 bottom-0 right-0 w-4 bg-gradient-to-l from-muted via-muted/70 to-transparent pointer-events-none"
			aria-hidden="true"
		></div>
		<div
			class="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-muted via-muted/70 to-transparent pointer-events-none"
			aria-hidden="true"
		></div>
	</ScrollArea>
</div>

<style lang="postcss">
	:global(pre code) {
		@apply grow py-4 h-full m-0 block;
	}

	:global(pre span.line) {
		@apply inline-block w-full px-4;
	}

	:global(pre span.line.highlighted) {
		@apply bg-yellow-200/50;
	}

	:global(.dark pre span.line.highlighted) {
		@apply bg-yellow-400/20;
	}

	:global(pre span.line.diff.add) {
		@apply bg-green-300/50;
	}

	:global(pre span.line.diff.remove) {
		@apply bg-red-300/50;
	}

	:global(.dark pre span.line.diff.add) {
		@apply bg-green-600/20;
	}
	:global(.dark pre span.line.diff.remove) {
		@apply bg-red-600/20;
	}
</style>
