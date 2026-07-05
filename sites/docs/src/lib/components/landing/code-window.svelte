<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		filename,
		source,
		children,
		rendered,
		renderedLabel = 'Rendered'
	}: {
		/** Filename shown in the window title bar. */
		filename: string;
		/** Pre-highlighted source HTML (Shiki `?source` output). */
		source?: string;
		/** Custom body, used when there's no pre-highlighted `source`. */
		children?: Snippet;
		/** Optional live preview docked below the code. */
		rendered?: Snippet;
		renderedLabel?: string;
	} = $props();
</script>

<div
	class="code-window bg-card min-w-0 overflow-hidden rounded-xl border border-border shadow-lg shadow-black/3 dark:shadow-black/20"
>
	<div class="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
		<span class="flex gap-1.5" aria-hidden="true">
			<span class="size-2.5 rounded-full bg-border"></span>
			<span class="size-2.5 rounded-full bg-border"></span>
			<span class="size-2.5 rounded-full bg-border"></span>
		</span>
		<span class="ml-1 font-mono text-xs text-muted-foreground">{filename}</span>
	</div>

	{#if source}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted Shiki output generated at build time -->
		<div class="code-body">{@html source}</div>
	{:else if children}
		<div class="code-body font-mono text-[0.8125rem] leading-[1.7]">{@render children()}</div>
	{/if}

	{#if rendered}
		<div
			class="flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-4 py-4"
		>
			<span class="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground/70"
				>{renderedLabel}</span
			>
			{@render rendered()}
		</div>
	{/if}
</div>

<style>
	.code-body :global(pre) {
		margin: 0;
		border-radius: 0;
		padding: 1.1rem 1.25rem;
		font-size: 0.8125rem;
		line-height: 1.7;
		overflow-x: auto;
		background: transparent !important;
	}
	.code-body :global(code) {
		font-family: var(--font-mono);
	}
</style>
