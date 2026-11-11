<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Choice, Column, Nested, Options, Placement, TreeNode } from './field-types.js';

	const {
		options,
		style,
		tree,
		columns = [],
		choice,
		transition = false,
		attrs,
		data,
		onpick,
		nested,
		children
	}: {
		/** How it behaves. */
		options?: Options;
		/** Inline styling. */
		style?: { color: string; width?: number };
		tree: TreeNode;
		columns?: Column[];
		choice?: Choice;
		transition?: boolean | Placement;
		attrs?: HTMLAttributes<HTMLDivElement>;
		data?: Record<string, number>;
		onpick?: (value: Options) => void;
		nested?: Nested;
		children?: Snippet;
	} = $props();
</script>

<div {...attrs}>
	{options?.delay}
	{style?.color}
	{tree.label}
	{columns.length}
	{choice?.kind}
	{transition}
	{data}
	{nested}
	<button onclick={() => onpick?.({ placement: { side: 'top' } })}>pick</button>
	{@render children?.()}
</div>
