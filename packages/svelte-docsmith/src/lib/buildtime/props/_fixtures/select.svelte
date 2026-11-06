<script lang="ts" generics="T extends string, U = number">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	type Props = {
		/** Options to pick from. */
		options: T[];
		/** The picked option. */
		value?: T;
		/** Renders one option. */
		option?: Snippet<[T, U]>;
	} & HTMLAnchorAttributes;

	let { options, value = $bindable(), option, ...rest }: Props = $props();
</script>

<a {...rest}>
	{#each options as o (o)}
		{#if option}{@render option(o, 0 as U)}{:else}{o}{/if}
	{/each}
	{value}
</a>
