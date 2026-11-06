<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { Tone } from './types.js';

	let {
		class: className,
		tone = 'info'
	}: {
		/** Classes, in any form `clsx` accepts. */
		class?: ClassValue;
		tone?: Tone;
	} = $props();
</script>

<p class={className}>{tone}</p>
