<script lang="ts">
	import { useClipboard } from '$lib/clipboard.svelte.js';
	import type { Snippet } from 'svelte';
	import { ScrollArea } from '../shadcn/scroll-area/index.js';

	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import { Button } from '../shadcn/button/index.js';
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

<style>
	/*
	 * Plain CSS (not @apply): these style Shiki's output and ship inside the
	 * published package, where the consumer's Tailwind theme context isn't
	 * available to resolve @apply (Tailwind v4 compiles scoped styles in
	 * isolation). See PLAN.md §2.5.
	 */
	:global(pre code) {
		display: block;
		flex-grow: 1;
		height: 100%;
		margin: 0;
		padding-block: 1rem;
	}

	:global(pre span.line) {
		display: inline-block;
		width: 100%;
		padding-inline: 1rem;
	}

	:global(pre span.line.highlighted) {
		background-color: rgb(254 240 138 / 0.5);
	}

	:global(.dark pre span.line.highlighted) {
		background-color: rgb(250 204 21 / 0.2);
	}

	:global(pre span.line.diff.add) {
		background-color: rgb(134 239 172 / 0.5);
	}

	:global(pre span.line.diff.remove) {
		background-color: rgb(252 165 165 / 0.5);
	}

	:global(.dark pre span.line.diff.add) {
		background-color: rgb(22 163 74 / 0.2);
	}

	:global(.dark pre span.line.diff.remove) {
		background-color: rgb(220 38 38 / 0.2);
	}
</style>
