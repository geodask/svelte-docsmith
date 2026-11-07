<script lang="ts">
	import LiveExample from '../live-example.svelte';
	import type { ExtractedProps } from '../../../core/extracted-props.js';
	import type { PlaygroundValues } from '../playground.svelte.js';

	const { controls, args }: { controls: ExtractedProps; args?: PlaygroundValues } = $props();
</script>

<LiveExample {controls} {args}>
	{#snippet children(props)}
		<output data-testid="rendered">{JSON.stringify(props)}</output>
	{/snippet}
</LiveExample>
