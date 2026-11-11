<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		before,
		after,
		beforeAlt = '',
		afterAlt = '',
		beforeLabel = 'Before',
		afterLabel = 'After',
		position = 50
	}: {
		/**
		 * The left side: a picture (a URL, or an imported file such as
		 * `import old from './old.png'`), or a snippet of live content.
		 */
		before: string | Snippet;
		/** The right side, the same way. */
		after: string | Snippet;
		/** What the left picture shows, for readers who can't see it. */
		beforeAlt?: string;
		/** What the right picture shows. */
		afterAlt?: string;
		/** Names the left side, on the picture and for screen readers. */
		beforeLabel?: string;
		/** Names the right side. */
		afterLabel?: string;
		/** Where the divider starts, as a percentage from the left. */
		position?: number;
	} = $props();

	// svelte-ignore state_referenced_locally
	let split = $state(clamp(position));
	let dragging = $state(false);
	let frame: HTMLDivElement;

	// Two pictures can be dragged anywhere. Live content keeps its own clicks,
	// so only the handle moves the divider.
	const pictures = $derived(typeof before === 'string' && typeof after === 'string');

	function clamp(value: number): number {
		return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 50));
	}

	function moveTo(clientX: number) {
		const box = frame.getBoundingClientRect();
		if (box.width > 0) split = clamp(((clientX - box.left) / box.width) * 100);
	}

	function start(event: PointerEvent, from: 'frame' | 'handle') {
		if (from === 'frame' && !pictures) return;
		if (event.button !== 0) return;
		dragging = true;
		(event.currentTarget as Element).setPointerCapture?.(event.pointerId);
		moveTo(event.clientX);
		event.preventDefault();
	}

	function move(event: PointerEvent) {
		if (dragging) moveTo(event.clientX);
	}

	function stop() {
		dragging = false;
	}

	function key(event: KeyboardEvent) {
		const step = event.shiftKey ? 10 : 2;
		const next =
			event.key === 'ArrowLeft' || event.key === 'ArrowDown'
				? split - step
				: event.key === 'ArrowRight' || event.key === 'ArrowUp'
					? split + step
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? 100
							: undefined;
		if (next === undefined) return;
		split = clamp(next);
		event.preventDefault();
	}
</script>

{#snippet side(content: string | Snippet, alt: string)}
	{#if typeof content === 'string'}
		<img class="compare-picture" src={content} {alt} draggable="false" />
	{:else}
		{@render content()}
	{/if}
{/snippet}

<!--
	Two versions of one thing, one over the other, split by a divider the
	reader drags or moves with the arrow keys. The right side fills the frame;
	the left is clipped to the divider, so the two line up exactly.
-->
<figure class="docsmith-compare not-prose" class:dragging style:--split="{split}%">
	<div
		class="compare-frame"
		class:compare-pictures={pictures}
		bind:this={frame}
		role="presentation"
		onpointerdown={(event) => start(event, 'frame')}
		onpointermove={move}
		onpointerup={stop}
		onpointercancel={stop}
	>
		<div class="compare-side compare-after">
			{@render side(after, afterAlt)}
		</div>
		<div class="compare-side compare-before" aria-hidden={split === 0 ? 'true' : undefined}>
			{@render side(before, beforeAlt)}
		</div>
		<span class="compare-label compare-label-before" aria-hidden="true">{beforeLabel}</span>
		<span class="compare-label compare-label-after" aria-hidden="true">{afterLabel}</span>
		<div
			class="compare-handle"
			role="slider"
			tabindex="0"
			aria-label="{beforeLabel} and {afterLabel} divider"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(split)}
			aria-valuetext="{Math.round(split)}% {beforeLabel}"
			aria-orientation="horizontal"
			onpointerdown={(event) => {
				event.stopPropagation();
				start(event, 'handle');
			}}
			onpointermove={move}
			onpointerup={stop}
			onpointercancel={stop}
			onkeydown={key}
		>
			<span class="compare-grip" aria-hidden="true"></span>
		</div>
	</div>
</figure>

<style>
	.docsmith-compare {
		margin: 1.75rem 0;
	}

	.compare-frame {
		position: relative;
		display: grid;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius, 0.5rem);
		background: var(--card);
		touch-action: pan-y;
	}
	.compare-pictures {
		cursor: ew-resize;
		user-select: none;
	}

	/* Both sides share one grid cell, so the frame is as tall as the taller. */
	.compare-side {
		grid-area: 1 / 1;
		min-width: 0;
	}
	.compare-before {
		clip-path: inset(0 calc(100% - var(--split)) 0 0);
		background: var(--card);
	}
	.compare-picture {
		display: block;
		width: 100%;
		height: auto;
		margin: 0;
	}

	.compare-label {
		position: absolute;
		top: 0.6rem;
		padding: 0.1rem 0.5rem;
		border-radius: 9999px;
		background: color-mix(in oklch, var(--background) 82%, transparent);
		color: var(--foreground);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		pointer-events: none;
	}
	.compare-label-before {
		left: 0.6rem;
	}
	.compare-label-after {
		right: 0.6rem;
	}

	/* The divider: a thin rule the full height of the frame, with a grip in the
	   middle. The hit area is wider than the rule so it is easy to catch. */
	.compare-handle {
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--split);
		width: 2.75rem;
		margin-left: -1.375rem;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: ew-resize;
		touch-action: none;
		outline: none;
	}
	.compare-handle::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 2px;
		margin-left: -1px;
		background: var(--background);
		box-shadow: 0 0 0 1px color-mix(in oklch, var(--foreground) 25%, transparent);
	}
	.compare-grip {
		position: relative;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 9999px;
		border: 1px solid var(--border);
		background: var(--background);
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.2);
	}
	/* Two chevrons, pointing out, drawn in CSS so the grip needs no icon. */
	.compare-grip::before,
	.compare-grip::after {
		content: '';
		position: absolute;
		top: 50%;
		width: 0.35rem;
		height: 0.35rem;
		margin-top: -0.175rem;
		border-left: 1.5px solid var(--foreground);
		border-bottom: 1.5px solid var(--foreground);
	}
	.compare-grip::before {
		left: 0.4rem;
		transform: rotate(45deg);
	}
	.compare-grip::after {
		right: 0.4rem;
		transform: rotate(-135deg);
	}
	.compare-handle:focus-visible .compare-grip {
		outline: 2px solid var(--ring, var(--primary));
		outline-offset: 2px;
	}
	.dragging .compare-grip {
		border-color: var(--primary);
	}
</style>
