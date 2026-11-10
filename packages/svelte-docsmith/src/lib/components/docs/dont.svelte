<script lang="ts">
	import type { Snippet } from 'svelte';
	import Guideline from './guideline.svelte';

	const {
		label = "Don't",
		children
	}: {
		/** The word above the panel. */
		label?: string;
		/** What not to do: text, an image or a live component. */
		children: Snippet;
	} = $props();
</script>

<Guideline kind="dont" {label} {children} />
