<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { mode } from 'mode-watcher';
	import { themeStore, applyActiveTheme } from '#lib/theme-store.svelte.ts';
	import type { Snippet } from 'svelte';

	// No <ModeWatcher /> here on purpose: DocsShell provides it for every page
	// (docs, landing, and /themes all render through it), dogfooding the
	// zero-install theme story.
	const { children }: { children: Snippet } = $props();

	// PROTOTYPE: when the theme builder embeds this page as a preview, it posts
	// the theme's tokens and the colour mode to show. Each preview frame keeps
	// its own mode, so a light and a dark frame can sit side by side.
	type Preview = {
		tokens: { light: Record<string, string>; dark: Record<string, string> };
		dark: boolean;
	};
	let preview = $state<Preview | null>(null);
	onMount(() => {
		themeStore.init();
		if (window.parent === window) return;
		const onmessage = (e: MessageEvent) => {
			if (e.origin === location.origin && e.data?.type === 'docsmith-preview') preview = e.data;
		};
		window.addEventListener('message', onmessage);
		window.parent.postMessage({ type: 'docsmith-preview-ready' }, location.origin);
		// Keep the frame's own mode even if mode-watcher re-applies the class.
		const root = document.documentElement;
		const observer = new MutationObserver(() => {
			if (preview && root.classList.contains('dark') !== preview.dark)
				root.classList.toggle('dark', preview.dark);
		});
		observer.observe(root, { attributes: true, attributeFilter: ['class'] });
		return () => {
			window.removeEventListener('message', onmessage);
			observer.disconnect();
		};
	});

	// Showcase: re-apply the viewer's chosen preset across the whole site, and
	// keep it correct as they toggle light/dark.
	$effect(() => {
		if (preview) {
			document.documentElement.classList.toggle('dark', preview.dark);
			document.documentElement.style.colorScheme = preview.dark ? 'dark' : 'light';
			applyActiveTheme(null, preview.dark, preview.tokens);
		} else {
			applyActiveTheme(themeStore.active, mode.current === 'dark', themeStore.custom);
		}
	});
</script>

{@render children()}
