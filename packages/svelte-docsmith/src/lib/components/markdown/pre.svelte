<script lang="ts">
	import { useClipboard } from '$lib/utils/clipboard.svelte.js';
	import type { Snippet } from 'svelte';
	import { ScrollArea } from '../shadcn/scroll-area/index.js';
	import CopyButton from '../chrome/copy-button.svelte';

	const clipboard = useClipboard();

	const {
		title,
		lineNumbers = false,
		startLine = 1,
		children
	}: {
		/** Filename or caption, from the fence's `title=` metadata. */
		title?: string;
		/** Number the lines, from `showLineNumbers`. */
		lineNumbers?: boolean;
		/** First line's number, from `startLine=`. */
		startLine?: number;
		children: Snippet;
	} = $props();
</script>

<div class="rounded-md overflow-hidden bg-muted mt-2 shadow-md text-sm relative">
	{#if title}
		<!-- The filename bar doubles as the copy button's row, so the button stops
		     floating over the first line of code when a title is present. -->
		<div class="docsmith-code-title">
			<span class="docsmith-code-title-text">{title}</span>
			<CopyButton copied={clipboard.copied} onclick={() => clipboard.copy()} class="bg-muted" />
		</div>
	{/if}

	<ScrollArea orientation="both" class="relative">
		{#if !title}
			<CopyButton
				copied={clipboard.copied}
				onclick={() => clipboard.copy()}
				class="bg-muted absolute top-2 right-2 z-10"
			/>
		{/if}

		<pre
			class="not-prose shiki max-h-[32rem] flex shrink"
			class:docsmith-line-numbers={lineNumbers}
			style={lineNumbers && startLine !== 1 ? `--docsmith-line-start: ${startLine - 1}` : undefined}
			use:clipboard.readText>
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

	/* --- Filename bar --- */
	.docsmith-code-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.4rem 0.5rem 0.4rem 1rem;
		border-bottom: 1px solid var(--border);
		background: color-mix(in oklch, var(--muted) 60%, var(--background));
	}
	.docsmith-code-title-text {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.78rem;
		color: var(--muted-foreground);
		overflow-wrap: anywhere;
	}

	/* --- Line numbers ---
	   A CSS counter on Shiki's existing per-line spans, so numbering adds no DOM
	   and stays out of the text the copy button reads. `--docsmith-line-start`
	   offsets the counter for a snippet lifted out of a larger file. */
	:global(pre.docsmith-line-numbers code) {
		counter-reset: docsmith-line var(--docsmith-line-start, 0);
	}
	:global(pre.docsmith-line-numbers span.line) {
		counter-increment: docsmith-line;
		position: relative;
		padding-inline-start: 3.2rem;
	}
	:global(pre.docsmith-line-numbers span.line::before) {
		content: counter(docsmith-line);
		position: absolute;
		left: 0;
		width: 2.4rem;
		text-align: right;
		color: color-mix(in oklch, var(--muted-foreground) 65%, transparent);
		/* Numbers are decoration, not content: keep them out of selections and
		   off the clipboard. */
		user-select: none;
	}
	/* The diff gutter glyph would collide with the number, so shift it over. */
	:global(pre.docsmith-line-numbers span.line.diff::before) {
		content: counter(docsmith-line);
	}
	:global(pre.docsmith-line-numbers span.line.diff::after) {
		position: absolute;
		left: 2.7rem;
		font-weight: 600;
	}
	:global(pre.docsmith-line-numbers span.line.diff.add::after) {
		content: '+';
		color: oklch(0.6 0.15 150);
	}
	:global(pre.docsmith-line-numbers span.line.diff.remove::after) {
		content: '−';
		color: oklch(0.58 0.19 25);
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

	/* --- Twoslash hovers ---
	   Restyled from @shikijs/twoslash's rich theme onto our tokens so the popup
	   belongs to the site in both colour schemes. Underline marks a token as
	   inspectable; the popup itself is a plain hidden sibling revealed on hover,
	   so it needs no JavaScript. */
	:global(pre .twoslash-hover) {
		position: relative;
		border-bottom: 1px dotted color-mix(in oklch, var(--muted-foreground) 55%, transparent);
	}
	:global(pre .twoslash-popup-container) {
		position: absolute;
		z-index: 20;
		display: none;
		left: 0;
		top: 1.6em;
		max-width: min(36rem, 80vw);
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: var(--radius, 0.5rem);
		background: var(--popover, var(--card));
		color: var(--popover-foreground, var(--foreground));
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
		white-space: pre-wrap;
		text-align: left;
		font-size: 0.85em;
		line-height: 1.5;
	}
	:global(pre .twoslash-hover:hover .twoslash-popup-container) {
		display: block;
	}
	:global(pre .twoslash-popup-code) {
		font-family: var(--font-mono, ui-monospace, monospace);
	}
	:global(pre .twoslash-popup-docs) {
		margin-top: 0.4rem;
		padding-top: 0.4rem;
		border-top: 1px solid var(--border);
		color: var(--muted-foreground);
	}
	/* A snippet that deliberately shows an error (// @errors:) marks the line. */
	:global(pre .twoslash-error) {
		background: color-mix(in oklch, oklch(0.62 0.2 25) 14%, transparent);
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
