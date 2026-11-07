<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { mode } from 'mode-watcher';
	import { themeStore, applyActiveTheme, type AppliedTokens } from '#lib/theme-store.svelte.ts';
	import type { Snippet } from 'svelte';

	// No <ModeWatcher /> here on purpose: DocsShell provides it for every page
	// (docs, landing, and /themes all render through it), dogfooding the
	// zero-install theme story.
	const { children }: { children: Snippet } = $props();

	// The theme builder iframes /themes/preview and posts the theme and colour
	// mode into it. Each frame keeps its own mode, so light and dark previews
	// can sit side by side. Only same-origin messages count.
	type Preview = { tokens: AppliedTokens; dark: boolean };
	let preview = $state<Preview | null>(null);

	onMount(() => {
		themeStore.init();
		if (window.parent === window) return;
		const root = document.documentElement;
		const onmessage = (e: MessageEvent) => {
			if (e.origin !== location.origin || e.data?.type !== 'docsmith-preview') return;
			preview = { tokens: e.data.tokens, dark: Boolean(e.data.dark) };
		};
		window.addEventListener('message', onmessage);
		window.parent.postMessage({ type: 'docsmith-preview-ready' }, location.origin);
		// mode-watcher may re-apply the reader's own mode (a system change, say):
		// keep the frame's posted one.
		const observer = new MutationObserver(() => {
			if (preview && root.classList.contains('dark') !== preview.dark) {
				root.classList.toggle('dark', preview.dark);
			}
		});
		observer.observe(root, { attributes: true, attributeFilter: ['class'] });
		return () => {
			window.removeEventListener('message', onmessage);
			observer.disconnect();
		};
	});

	// Re-apply the reader's chosen theme across the site, and keep it right as
	// they toggle light and dark; in a preview frame, apply the posted theme.
	$effect(() => {
		if (preview) {
			document.documentElement.classList.toggle('dark', preview.dark);
			document.documentElement.style.colorScheme = preview.dark ? 'dark' : 'light';
			applyPreview(preview);
		} else {
			applyActiveTheme(themeStore.active, mode.current === 'dark', themeStore.custom);
		}
	});

	/** Paint a preview frame without touching the reader's saved theme. */
	function applyPreview({ tokens, dark }: Preview) {
		const root = document.documentElement;
		for (const key of previewKeys) root.style.removeProperty(`--${key}`);
		const t = dark ? { ...tokens.light, ...tokens.dark } : tokens.light;
		for (const [key, value] of Object.entries(t)) root.style.setProperty(`--${key}`, value);
		previewKeys = Object.keys(t);
	}
	let previewKeys: string[] = [];
</script>

{@render children()}
