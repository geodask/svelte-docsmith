<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		title,
		description,
		actions,
		before,
		children
	}: {
		title: string;
		/** Supporting line below the heading. */
		description?: string;
		/** Call-to-action buttons. */
		actions?: Snippet;
		/**
		 * Optional content above the heading (e.g. a pre-release note). Placed
		 * before the title so the section can still *end* on the actions.
		 */
		before?: Snippet;
		/** Anything to sit below the actions, e.g. a secondary note. */
		children?: Snippet;
	} = $props();
</script>

<!-- The closing panel of a landing page: a bordered card with a soft glow behind
     the heading, so the page ends on the primary colour rather than trailing off. -->
<section class="mx-auto max-w-7xl px-4 py-20 md:px-6 lg:px-8 lg:py-28">
	<div
		class="border-border bg-card relative isolate overflow-hidden rounded-2xl border px-6 py-16 text-center shadow-sm md:px-12"
	>
		<div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
			<div
				class="bg-primary/15 absolute top-0 left-1/2 h-75 w-150 -translate-x-1/2 rounded-full opacity-50 blur-[100px]"
			></div>
		</div>

		{#if before}
			<div class="mx-auto mb-8 max-w-xl text-left">{@render before()}</div>
		{/if}

		<h2
			class="font-serif mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
		>
			{title}
		</h2>

		{#if description}
			<p class="text-foreground mx-auto mt-4 max-w-xl text-lg leading-relaxed text-pretty">
				{description}
			</p>
		{/if}

		{#if actions}
			<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
				{@render actions()}
			</div>
		{/if}

		{#if children}
			<div class="mx-auto mt-10 max-w-xl text-left">{@render children()}</div>
		{/if}
	</div>
</section>
