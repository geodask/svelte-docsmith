<script lang="ts">
	import { useClipboard } from '$lib/utils/clipboard.svelte.js';
	import type { Snippet } from 'svelte';
	import { ScrollArea } from '../shadcn/scroll-area/index.js';
	import CopyButton from '../chrome/copy-button.svelte';

	const clipboard = useClipboard();

	const { children }: { children: Snippet } = $props();
</script>

<div class="rounded-md overflow-hidden bg-muted mt-2 shadow-md text-sm relative">
	<ScrollArea orientation="both" class="relative">
		<CopyButton
			copied={clipboard.copied}
			onclick={() => clipboard.copy()}
			class="bg-muted absolute top-2 right-2 z-10"
		/>

		<pre class="not-prose shiki max-h-[32rem] flex shrink" use:clipboard.readText>
			{@render children()}
		</pre>
	</ScrollArea>
</div>

<style>
	/*
	 * Plain CSS (not @apply): these style Shiki's output and ship inside the
	 * published package, where the consumer's Tailwind theme context isn't
	 * available to resolve @apply (Tailwind v4 compiles scoped styles in
	 * isolation).
	 */
	:global(pre code) {
		display: block;
		flex-grow: 1;
		height: 100%;
		margin: 0;
		padding-block: 1rem;
	}

	:global(pre span.line) {
		display: inline-block;
		width: 100%;
		padding-inline: 1rem;
	}

	/* Two tiers of annotation. EMPHASIS (highlight, word) tints with the theme's
	   --primary, so it reads as the brand pointing at a line and recolors with
	   the active theme. SEMANTIC (diff, error, warning) uses fixed OKLCH hues so
	   green/red/amber stay legible on any theme. All are translucent washes over
	   the code background via color-mix. */

	/* --- Line highlight (// [!code highlight] and {1,3} meta) --- */
	:global(pre span.line.highlighted) {
		background: color-mix(in oklch, var(--primary) 12%, transparent);
	}
	:global(.dark pre span.line.highlighted) {
		background: color-mix(in oklch, var(--primary) 20%, transparent);
	}

	/* --- Diff (// [!code ++] / [!code --]) with +/- gutter glyphs --- */
	:global(pre span.line.diff) {
		position: relative;
	}
	:global(pre span.line.diff.add) {
		background: color-mix(in oklch, oklch(0.7 0.16 150) 15%, transparent);
	}
	:global(pre span.line.diff.remove) {
		background: color-mix(in oklch, oklch(0.62 0.2 25) 14%, transparent);
	}
	:global(.dark pre span.line.diff.add) {
		background: color-mix(in oklch, oklch(0.7 0.16 150) 22%, transparent);
	}
	:global(.dark pre span.line.diff.remove) {
		background: color-mix(in oklch, oklch(0.62 0.2 25) 22%, transparent);
	}
	:global(pre span.line.diff::before) {
		position: absolute;
		left: 0.45rem;
		font-weight: 600;
	}
	:global(pre span.line.diff.add::before) {
		content: '+';
		color: oklch(0.6 0.15 150);
	}
	:global(pre span.line.diff.remove::before) {
		content: '−';
		color: oklch(0.58 0.19 25);
	}
	:global(.dark pre span.line.diff.add::before) {
		color: oklch(0.78 0.17 150);
	}
	:global(.dark pre span.line.diff.remove::before) {
		color: oklch(0.72 0.18 25);
	}

	/* --- Error / warning severity (// [!code error] / [!code warning]).
	   No gutter glyph, so they stay distinct from the +/- diff lines. --- */
	:global(pre span.line.highlighted.error) {
		background: color-mix(in oklch, oklch(0.62 0.2 25) 18%, transparent);
	}
	:global(pre span.line.highlighted.warning) {
		background: color-mix(in oklch, oklch(0.8 0.13 85) 22%, transparent);
	}
	:global(.dark pre span.line.highlighted.error) {
		background: color-mix(in oklch, oklch(0.62 0.2 25) 26%, transparent);
	}
	:global(.dark pre span.line.highlighted.warning) {
		background: color-mix(in oklch, oklch(0.8 0.13 85) 20%, transparent);
	}

	/* --- Focus (// [!code focus]): dim the other lines and restore on hover.
	   A clean opacity fade reads calmer than a muddy blur. `:has` recreates
	   Shiki's stripped container flag from the line classes alone. --- */
	:global(pre code:has(span.line.focused) span.line:not(.focused)) {
		opacity: 0.42;
		transition: opacity 0.25s ease;
	}
	:global(pre:hover code:has(span.line.focused) span.line:not(.focused)) {
		opacity: 1;
	}
	@media (prefers-reduced-motion: reduce) {
		:global(pre code:has(span.line.focused) span.line:not(.focused)) {
			transition: none;
		}
	}

	/* --- Word highlight (// [!code word:name]): a primary-tinted inline pill --- */
	:global(pre .highlighted-word) {
		border-radius: 0.3rem;
		padding: 0.1rem 0.3rem;
		background: color-mix(in oklch, var(--primary) 16%, transparent);
		box-shadow: 0 0 0 1px color-mix(in oklch, var(--primary) 35%, transparent);
	}
	:global(.dark pre .highlighted-word) {
		background: color-mix(in oklch, var(--primary) 24%, transparent);
	}
</style>
