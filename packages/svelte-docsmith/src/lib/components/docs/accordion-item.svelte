<script lang="ts">
	import * as AccordionPrimitive from '$lib/components/shadcn/accordion/index.js';
	import { nextAccordionValue } from './accordion.svelte';
	import type { Snippet } from 'svelte';

	const {
		title,
		children
	}: {
		/** The always-visible summary that toggles the panel. */
		title: string;
		children: Snippet;
	} = $props();

	// Claimed once at init, in document order, so it stays stable across renders.
	const value = nextAccordionValue();
</script>

<AccordionPrimitive.Item {value}>
	<AccordionPrimitive.Trigger>{title}</AccordionPrimitive.Trigger>
	<AccordionPrimitive.Content>
		{@render children()}
	</AccordionPrimitive.Content>
</AccordionPrimitive.Item>
