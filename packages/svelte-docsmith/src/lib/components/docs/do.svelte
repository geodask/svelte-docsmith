<script lang="ts">
	import type { Snippet } from 'svelte';
	import Guideline from './guideline.svelte';

	const {
		label = 'Do',
		children
	}: {
		/** The word above the panel. */
		label?: string;
		/** What to do: text, an image or a live component. */
		children: Snippet;
	} = $props();
</script>

<Guideline kind="do" {label} {children} />
