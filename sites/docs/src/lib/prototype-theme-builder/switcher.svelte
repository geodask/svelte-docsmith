<script lang="ts">
	// PROTOTYPE — throwaway. Floating bar to flip between builder variants.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { variants, current }: { variants: [string, string][]; current: string } = $props();
	const index = $derived(
		Math.max(
			0,
			variants.findIndex(([key]) => key === current)
		)
	);

	function go(delta: number) {
		const [key] = variants[(index + delta + variants.length) % variants.length];
		const url = new URL(page.url.href);
		url.searchParams.set('variant', key);
		goto(url.pathname + url.search + url.hash, { replaceState: true });
	}

	function onkeydown(e: KeyboardEvent) {
		const el = e.target as HTMLElement;
		if (el.closest('input, textarea, select, [contenteditable]')) return;
		if (e.key === 'ArrowLeft') go(-1);
		if (e.key === 'ArrowRight') go(1);
	}
</script>

<svelte:window {onkeydown} />

<div
	class="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1.5 font-sans text-sm text-white shadow-2xl ring-1 ring-white/20"
	data-testid="variant-switcher"
>
	<button
		class="rounded-full px-2 py-0.5 hover:bg-white/15"
		onclick={() => go(-1)}
		aria-label="Previous variant">←</button
	>
	<span class="px-2 tabular-nums">PROTOTYPE {variants[index][0]} · {variants[index][1]}</span>
	<button
		class="rounded-full px-2 py-0.5 hover:bg-white/15"
		onclick={() => go(1)}
		aria-label="Next variant">→</button
	>
</div>
