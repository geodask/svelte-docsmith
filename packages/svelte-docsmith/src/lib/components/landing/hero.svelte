<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		title,
		description,
		eyebrow,
		actions,
		media
	}: {
		/** The headline. Pass a snippet instead of a string to mark part of it up. */
		title: string | Snippet;
		/** Supporting paragraph below the headline. */
		description?: string | Snippet;
		/** A pill, badge, or announcement link sitting above the headline. */
		eyebrow?: Snippet;
		/** Call-to-action buttons. */
		actions?: Snippet;
		/**
		 * The second column: a code sample, screenshot, or live demo. Without it the
		 * hero collapses to a single centred column.
		 */
		media?: Snippet;
	} = $props();
</script>

<!-- Renders either a plain string or a snippet, so simple pages stay simple. -->
{#snippet content(value: string | Snippet)}
	{#if typeof value === 'string'}{value}{:else}{@render value()}{/if}
{/snippet}

<section
	class="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-16 pb-20 md:px-6 lg:gap-10 lg:px-8 lg:pt-24 lg:pb-28 {media
		? 'lg:grid-cols-[1.05fr_1fr]'
		: 'max-w-3xl text-center'}"
>
	<div class="min-w-0">
		{#if eyebrow}
			{@render eyebrow()}
		{/if}

		<h1
			class="text-5xl font-semibold tracking-[-0.03em] text-balance sm:text-6xl lg:text-[4.25rem] lg:leading-[1.02] {eyebrow
				? 'mt-6'
				: ''}"
		>
			{@render content(title)}
		</h1>

		{#if description}
			<p
				class="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed text-pretty {media
					? ''
					: 'mx-auto'}"
			>
				{@render content(description)}
			</p>
		{/if}

		{#if actions}
			<div class="mt-8 flex flex-wrap items-center gap-3 {media ? '' : 'justify-center'}">
				{@render actions()}
			</div>
		{/if}
	</div>

	{#if media}
		<div class="min-w-0">{@render media()}</div>
	{/if}
</section>
