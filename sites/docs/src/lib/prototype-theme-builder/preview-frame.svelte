<script lang="ts">
	// PROTOTYPE — throwaway. A real page of this docs site in an iframe, scaled
	// to fit, painted with the builder's tokens in one colour mode.
	import type { ThemeTokens } from './core.ts';

	let {
		src,
		tokens,
		dark,
		boxHeight = 'calc(100vh - 12rem)'
	}: { src: string; tokens: ThemeTokens; dark: boolean; boxHeight?: string } = $props();

	const WIDTH = 1280; // render the desktop layout, then scale it down
	let frame = $state<HTMLIFrameElement>();
	let box = $state<HTMLDivElement>();
	let scale = $state(0.5);
	let height = $state(800);

	$effect(() => {
		if (!box) return;
		const ro = new ResizeObserver(([entry]) => {
			scale = entry.contentRect.width / WIDTH;
			height = entry.contentRect.height / scale;
		});
		ro.observe(box);
		return () => ro.disconnect();
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
			if (e.source === frame?.contentWindow && e.data?.type === 'docsmith-preview-ready') send();
		};
		window.addEventListener('message', onmessage);
		return () => window.removeEventListener('message', onmessage);
	});
</script>

<div
	bind:this={box}
	class="border-border relative overflow-hidden rounded-xl border shadow-lg"
	style="height: {boxHeight}"
>
	<iframe
		bind:this={frame}
		{src}
		title="Theme preview ({dark ? 'dark' : 'light'})"
		onload={send}
		class="absolute top-0 left-0 origin-top-left border-0"
		style="width: {WIDTH}px; height: {height}px; transform: scale({scale})"
	></iframe>
</div>
