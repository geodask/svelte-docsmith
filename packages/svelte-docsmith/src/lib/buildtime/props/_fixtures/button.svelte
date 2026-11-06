<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		/** Show a spinner. */
		loading?: boolean;
	}

	let { loading = false, ...rest }: Props = $props();
</script>

<button {...rest}>{loading}</button>
