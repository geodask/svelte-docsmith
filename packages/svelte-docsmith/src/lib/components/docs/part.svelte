<!--
@component
One named part of the component in an `Anatomy`, in its `parts` snippet. Its
number is its place among the parts, and matches the label on the element marked
`data-part` with the same name.
-->
<script lang="ts">
	import { DEV } from 'esm-env';
	import { onDestroy, untrack, type Snippet } from 'svelte';
	import { findAnatomy } from './anatomy-context.js';

	const {
		name,
		children
	}: {
		/** The part's name: the `data-part` value it describes. */
		name: string;
		/** What the part is and does. */
		children?: Snippet;
	} = $props();

	const anatomy = findAnatomy();
	if (anatomy) {
		// The name is read once: a part is registered where it is written.
		onDestroy(anatomy.register(untrack(() => name)));
	} else if (DEV) {
		console.warn(
			`[svelte-docsmith] <Part name="${untrack(() => name)}"> belongs in the parts of an <Anatomy>.`
		);
	}

	const number = $derived(anatomy?.numberOf(name));

	function point(on: boolean) {
		if (!anatomy) return;
		if (on) anatomy.active = name;
		else if (anatomy.active === name) anatomy.active = undefined;
	}
</script>

<li
	class="anatomy-part"
	class:anatomy-part-active={anatomy?.active === name}
	onpointerenter={() => point(true)}
	onpointerleave={() => point(false)}
	onfocusin={() => point(true)}
	onfocusout={() => point(false)}
>
	<!-- The list already numbers the parts, in the same order, for screen readers. -->
	<span class="anatomy-part-number" aria-hidden="true">{number ?? ''}</span>
	<div class="anatomy-part-body">
		<code class="anatomy-part-name">{name}</code>
		{#if children}
			<div class="anatomy-part-text">{@render children()}</div>
		{/if}
	</div>
</li>

<style>
	.anatomy-part {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		margin: 0;
		padding: 0.5rem 0.625rem;
		border-radius: var(--radius, 0.5rem);
		transition: background-color 120ms;
	}
	.anatomy-part-active {
		background: color-mix(in oklch, var(--primary) 7%, transparent);
	}
	.anatomy-part-number {
		flex: none;
		display: inline-grid;
		place-items: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.3rem;
		border-radius: 9999px;
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 0.7rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		transform: translateY(-0.1rem);
	}
	.anatomy-part-body {
		min-width: 0;
		font-size: 0.9rem;
		line-height: 1.6;
	}
	.anatomy-part-name {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.85em;
		font-weight: 600;
		color: var(--foreground);
	}
	.anatomy-part-text {
		color: var(--muted-foreground);
	}
	.anatomy-part-text :global(p) {
		margin: 0.25rem 0 0;
	}
	.anatomy-part-text :global(code) {
		font-size: 0.85em;
	}
</style>
