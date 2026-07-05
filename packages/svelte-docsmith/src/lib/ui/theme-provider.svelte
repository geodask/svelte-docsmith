<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';
	import type { Snippet } from 'svelte';

	const {
		children,
		disableTransitions = true
	}: {
		/** App content. Optional — the provider works as a bare `<ThemeProvider />` too. */
		children?: Snippet;
		/** Suppress the color transition on theme change (avoids a flash). */
		disableTransitions?: boolean;
	} = $props();
</script>

<!--
	Owns light/dark for the whole app: mounts mode-watcher, which toggles the
	`.dark` class on <html> and persists the choice. `DocsShell` renders this
	internally, so a consumer never installs or wires mode-watcher themselves.
	Use it directly to wrap non-DocsShell pages (a marketing/landing route).
-->
<ModeWatcher {disableTransitions} />
{#if children}{@render children()}{/if}
