<script lang="ts">
	// Test-only fixture: composes <Accordion> with real <AccordionItem> children so
	// the sequential-value context and single/multiple behaviour can be exercised.
	// Pruned from the package via `_fixtures`.
	import Accordion from '../accordion.svelte';
	import AccordionItem from '../accordion-item.svelte';

	let { multiple = false }: { multiple?: boolean } = $props();
</script>

<Accordion {multiple}>
	<AccordionItem title="First">First body</AccordionItem>
	<AccordionItem title="Second">Second body</AccordionItem>
</Accordion>
