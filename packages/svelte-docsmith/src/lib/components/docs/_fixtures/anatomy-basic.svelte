<script lang="ts">
	// Test-only fixture: an <Anatomy> over a small live component, with <Part>s
	// written in a different order from the DOM and one data-part left
	// undescribed. Pruned from the package via `_fixtures`.
	import Anatomy from '../anatomy.svelte';
	import Part from '../part.svelte';

	let { open = false }: { open?: boolean } = $props();
	let clicks = $state(0);
</script>

<Anatomy>
	<div data-part="root">
		<button data-part="trigger" onclick={() => (clicks += 1)}>Open</button>
		<span data-part="icon">→</span>
		<output>{clicks}</output>
		{#if open}<div data-part="content">Body</div>{/if}
	</div>
	{#snippet parts()}
		<Part name="trigger">The button.</Part>
		<Part name="root">The outer box.</Part>
		<Part name="content">What opens.</Part>
	{/snippet}
</Anatomy>
