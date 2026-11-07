<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';
	import type { Snippet } from 'svelte';

	const {
		children,
		disableTransitions = true
	}: {
		/** App content. Optional — the provider works as a bare `<ModeProvider />` too. */
		children?: Snippet;
		/** Suppress the colour transition when the mode changes (avoids a flash). */
		disableTransitions?: boolean;
	} = $props();
</script>

<!--
	Owns the colour mode (light or dark) for the whole app: mounts mode-watcher, which toggles the
	`.dark` class on <html> and persists the choice. `DocsShell` renders this
	internally, so a consumer never installs or wires mode-watcher themselves.
	Use it directly to wrap non-DocsShell pages (a marketing/landing route).
-->
<ModeWatcher {disableTransitions} />
{#if children}{@render children()}{/if}
