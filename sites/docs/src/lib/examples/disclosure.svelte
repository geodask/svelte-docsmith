<!--
@component
A heading that shows and hides its details. The example behind the Anatomy page,
with each part marked `data-part`.
-->
<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { Snippet } from 'svelte';

	const {
		title,
		open: initiallyOpen = false,
		children
	}: {
		/** The heading the reader presses. */
		title: string;
		/** Start with the details showing. */
		open?: boolean;
		/** The details. */
		children: Snippet;
	} = $props();

	// svelte-ignore state_referenced_locally
	let open = $state(initiallyOpen);
	const id = $props.id();
</script>

<div
	data-part="root"
	class="w-80 max-w-full rounded-lg border border-border bg-background text-sm shadow-sm"
>
	<button
		data-part="trigger"
		type="button"
		class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-medium"
		aria-expanded={open}
		aria-controls="{id}-content"
		onclick={() => (open = !open)}
	>
		<span data-part="title">{title}</span>
		<ChevronDown
			data-part="indicator"
			class="size-4 text-muted-foreground transition-transform duration-200 {open
				? 'rotate-180'
				: ''}"
		/>
	</button>
	{#if open}
		<div
			data-part="content"
			id="{id}-content"
			class="border-t border-border px-4 py-3 text-muted-foreground"
		>
			{@render children()}
		</div>
	{/if}
</div>
