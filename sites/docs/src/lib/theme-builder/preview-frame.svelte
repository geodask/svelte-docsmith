<script lang="ts">
	// One preview frame: /themes/preview in an iframe, rendered at desktop
	// width and scaled to fit its box, painted with the builder's tokens in one
	// colour mode. The frame says when it's ready; the theme is re-sent then,
	// on load, and on every change. Its header mode toggle calls `onmode`.
	import type { ThemeTokens } from './core.ts';

	let {
		tokens,
		dark,
		boxHeight = 'calc(100vh - 11rem)',
		onmode
	}: {
		tokens: ThemeTokens;
		dark: boolean;
		boxHeight?: string;
		onmode?: (dark: boolean) => void;
	} = $props();

	const SRC = '/themes/preview';
	const WIDTH = 1280;
	let frame = $state<HTMLIFrameElement>();
	let box = $state<HTMLDivElement>();
	let scale = $state(0.5);
	let height = $state(800);

	$effect(() => {
		if (!box) return;
		let raf = 0;
		const ro = new ResizeObserver(([entry]) => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				scale = entry.contentRect.width / WIDTH;
				height = entry.contentRect.height / scale;
			});
		});
		ro.observe(box);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	});

	function send() {
		frame?.contentWindow?.postMessage(
			{ type: 'docsmith-preview', tokens: $state.snapshot(tokens), dark },
			location.origin
		);
	}

	$effect(() => {
		void tokens;
		void dark;
		send();
	});

	$effect(() => {
		const onmessage = (e: MessageEvent) => {
			if (e.origin !== location.origin || e.source !== frame?.contentWindow) return;
			if (e.data?.type === 'docsmith-preview-ready') send();
			if (e.data?.type === 'docsmith-preview-mode') onmode?.(Boolean(e.data.dark));
		};
		window.addEventListener('message', onmessage);
		return () => window.removeEventListener('message', onmessage);
	});
</script>

<div
	bind:this={box}
	class="border-border bg-background relative overflow-hidden rounded-xl border shadow-lg"
	style="height: {boxHeight}"
>
	<iframe
		bind:this={frame}
		src={SRC}
		title="Theme preview, {dark ? 'dark' : 'light'} mode"
		onload={send}
		tabindex="-1"
		class="absolute top-0 left-0 origin-top-left border-0"
		style="width: {WIDTH}px; height: {height}px; transform: scale({scale})"
	></iframe>
</div>
