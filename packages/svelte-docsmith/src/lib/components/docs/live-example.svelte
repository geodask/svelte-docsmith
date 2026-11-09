<script lang="ts">
	import { useClipboard } from '#lib/utils/clipboard.svelte.js';
	import { Button } from '../shadcn/button/index.js';
	import CopyButton from '../chrome/copy-button.svelte';
	import PropsControls from './props-controls.svelte';
	import Code from '@lucide/svelte/icons/code';
	import { untrack, type Snippet } from 'svelte';
	import type { ExtractedProps } from '../../core/extracted-props.js';
	import { Playground, type PlaygroundValues } from './playground.svelte.js';
	import { page } from '$app/state';
	import { report } from '../reader-events.js';

	const {
		source,
		controls,
		args,
		children
	}: {
		/**
		 * Pre-highlighted source HTML for the source panel. Pass a `?source`
		 * import of the same file.
		 */
		source?: string;
		/**
		 * A props import (`import props from './badge.svelte?props'`): shows a
		 * control for each prop whose type allows one, and passes the current
		 * values to `children`.
		 * @experimental
		 */
		controls?: ExtractedProps;
		/**
		 * Starting values for the controls, over the component's own defaults.
		 * Fills a required prop, or starts the example in a chosen state.
		 * @experimental
		 */
		args?: PlaygroundValues;
		/**
		 * The live, rendered example. With `controls` it receives the current
		 * values: `{#snippet children(props)}<Badge {...props} />{/snippet}`.
		 */
		children: Snippet<[PlaygroundValues]>;
	} = $props();

	// A new playground only when the props import itself changes: `of` settles
	// on the same object when other props update. A reset reads `args` again.
	const of = $derived(controls);
	const playground = $derived(of && untrack(() => new Playground(of, () => args)));

	let showSource = $state(false);
	const clipboard = useClipboard();

	// A `?source` import is always a Svelte component's source.
	function copy() {
		report({
			type: 'copy_code',
			path: page.url.pathname,
			language: 'svelte',
			source: 'live_example'
		});
		clipboard.copy();
	}
</script>

<div class="not-prose my-6 overflow-hidden rounded-lg border border-border">
	<div class="flex justify-center bg-muted/30 p-8">
		{@render children(playground?.values ?? {})}
	</div>

	{#if playground}
		<PropsControls {playground} />
	{/if}

	{#if source}
		<div class="flex items-center border-t border-border bg-muted/50 px-2 py-1">
			<Button variant="ghost" size="sm" onclick={() => (showSource = !showSource)}>
				<Code class="size-4" />
				{showSource ? 'Hide' : 'Show'} source
			</Button>
			{#if showSource}
				<CopyButton copied={clipboard.copied} onclick={copy} class="ml-auto" />
			{/if}
		</div>

		{#if showSource}
			<div class="source bg-muted border-t border-border text-sm" use:clipboard.readText>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted Shiki-highlighted source generated at build time -->
				{@html source}
			</div>
		{/if}
	{/if}
</div>

<style>
	/* Match the markdown code-block treatment: the source sits on `bg-muted`
	   (Shiki's own background is stripped by the `?source` transform) with the
	   same per-line padding. */
	.source :global(pre) {
		margin: 0;
		border-radius: 0;
		max-height: 32rem;
		overflow: auto;
		background: transparent;
	}
	.source :global(pre code) {
		display: block;
		padding-block: 1rem;
	}
	.source :global(pre span.line) {
		display: inline-block;
		width: 100%;
		padding-inline: 1rem;
	}
</style>
