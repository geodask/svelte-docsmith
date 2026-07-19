<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		title,
		icon,
		children
	}: {
		title: string;
		/** Optional leading icon, rendered in a tinted square. */
		icon?: Snippet;
		/** The description. */
		children?: Snippet;
	} = $props();
</script>

<!-- One cell of a <FeatureGrid>. Icon beside the text rather than above it, so a
     row of features stays compact as the column count grows. -->
<div class="flex gap-4">
	{#if icon}
		<div
			class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg"
		>
			{@render icon()}
		</div>
	{/if}
	<div class="min-w-0">
		<h3 class="font-semibold">{title}</h3>
		{#if children}
			<p class="text-muted-foreground mt-1 text-sm leading-relaxed">{@render children()}</p>
		{/if}
	</div>
</div>
