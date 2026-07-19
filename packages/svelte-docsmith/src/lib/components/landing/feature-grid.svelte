<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		title,
		description,
		columns = 3,
		background = 'default',
		children
	}: {
		/** Section heading above the grid. */
		title?: string;
		/** Supporting line below the heading. */
		description?: string;
		/** Columns at the widest breakpoint; the grid steps down on smaller screens. */
		columns?: 2 | 3;
		/**
		 * `muted` gives the section a tinted band with rules above and below, for
		 * alternating against neighbouring sections.
		 */
		background?: 'default' | 'muted';
		/** The `<Feature>` cells. */
		children: Snippet;
	} = $props();
</script>

<section class={background === 'muted' ? 'border-border/50 bg-muted/20 border-y' : ''}>
	<div class="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8 lg:py-24">
		{#if title || description}
			<div class="mx-auto max-w-2xl text-center">
				{#if title}
					<h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
				{/if}
				{#if description}
					<p class="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
						{description}
					</p>
				{/if}
			</div>
		{/if}

		<div
			class="grid gap-x-10 gap-y-10 sm:grid-cols-2 {columns === 3 ? 'lg:grid-cols-3' : ''} {title ||
			description
				? 'mt-14'
				: ''}"
		>
			{@render children()}
		</div>
	</div>
</section>
