<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { mode } from 'mode-watcher';
	import { themeStore, applyActiveTheme } from '$lib/theme-store.svelte';
	import type { Snippet } from 'svelte';

	// No <ModeWatcher /> here on purpose: DocsShell provides it for every page
	// (docs, landing, and /themes all render through it), dogfooding the
	// zero-install theme story.
	const { children }: { children: Snippet } = $props();

	// Showcase: re-apply the viewer's chosen preset across the whole site, and
	// keep it correct as they toggle light/dark.
	onMount(() => themeStore.init());
	$effect(() => applyActiveTheme(themeStore.active, mode.current === 'dark'));
</script>

{@render children()}
