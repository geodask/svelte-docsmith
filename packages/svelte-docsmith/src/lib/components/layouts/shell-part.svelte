<script lang="ts" generics="Props extends Record<string, unknown>">
	// One overridable part of `DocsShell`, resolved: the author's override when
	// there is one, else the built-in part, each given the same props (ADR-0014).
	// The one place that choice is made, so the page and the mobile header draw
	// the same sidebar and the same table of contents.
	import type { Component, Snippet } from 'svelte';

	const {
		override,
		builtIn: BuiltIn,
		props
	}: {
		/** The snippet the author passed to `DocsShell` for this part, if any. */
		override: Snippet<[Props]> | undefined;
		/** The part the shell draws without one. */
		builtIn: Component<Props>;
		/** What either receives: the part's props, from `./parts.ts`. */
		props: Props;
	} = $props();
</script>

{#if override}
	{@render override(props)}
{:else}
	<BuiltIn {...props} />
{/if}
