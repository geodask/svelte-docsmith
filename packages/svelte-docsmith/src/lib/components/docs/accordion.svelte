<script lang="ts" module>
	import { getContext, setContext } from 'svelte';

	const KEY = Symbol('docsmith-accordion');

	type AccordionCtx = { count: number };

	/**
	 * Called by each <AccordionItem> at init to claim a stable, sequential value
	 * so authors never have to pass one. Falls back to a random id when used
	 * outside an <Accordion> (still valid for bits-ui, just not grouped).
	 */
	export function nextAccordionValue(): string {
		const ctx = getContext<AccordionCtx | undefined>(KEY);
		if (!ctx) return `item-${Math.random().toString(36).slice(2)}`;
		ctx.count += 1;
		return `item-${ctx.count}`;
	}
</script>

<script lang="ts">
	import * as AccordionPrimitive from '$lib/components/shadcn/accordion/index.js';
	import type { Snippet } from 'svelte';

	const {
		multiple = false,
		children
	}: {
		/** Allow several items open at once. Default: one at a time. */
		multiple?: boolean;
		children: Snippet;
	} = $props();

	setContext<AccordionCtx>(KEY, { count: 0 });
</script>

{#if multiple}
	<AccordionPrimitive.Root type="multiple" class="my-6">
		{@render children()}
	</AccordionPrimitive.Root>
{:else}
	<AccordionPrimitive.Root type="single" class="my-6">
		{@render children()}
	</AccordionPrimitive.Root>
{/if}
