<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import type { Snippet } from 'svelte';

	const {
		title,
		href,
		external = false,
		icon,
		children
	}: {
		title: string;
		/** Turns the card into a link. */
		href?: string;
		external?: boolean;
		/** Optional leading icon. */
		icon?: Snippet;
		/** Card body / description. */
		children?: Snippet;
	} = $props();

	const tag = $derived(href ? 'a' : 'div');
	const rel = $derived(external ? 'noopener noreferrer' : undefined);
	const target = $derived(external ? '_blank' : undefined);
</script>

<svelte:element
	this={tag}
	{href}
	{rel}
	{target}
	class="group not-prose flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors {href
		? 'hover:border-primary/40 focus-visible:border-primary/40 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden'
		: ''}"
>
	{#if icon}
		<div class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
			{@render icon()}
		</div>
	{/if}
	<div class="flex items-center gap-1.5">
		<h3 class="font-semibold tracking-tight">{title}</h3>
		{#if href}
			<ArrowRight
				class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
			/>
		{/if}
	</div>
	{#if children}
		<div class="text-sm leading-relaxed text-muted-foreground">{@render children()}</div>
	{/if}
</svelte:element>
