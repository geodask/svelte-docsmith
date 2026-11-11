<!--
@component
A live component with its named parts labelled over it and described below it.
Mark each part in the component with `data-part="name"`, and describe it with a
`<Part name="name">` in the `parts` snippet. The labels follow the parts as the
component changes, and clicks go through to it.
-->
<script lang="ts">
	import { DEV } from 'esm-env';
	import { onMount, type Snippet } from 'svelte';
	import { setAnatomy } from './anatomy-context.js';

	const {
		children,
		parts
	}: {
		/** The live component, with its parts marked `data-part="name"`. */
		children: Snippet;
		/** The parts list: a `<Part name="…">` for each part, in the order to number them. */
		parts?: Snippet;
	} = $props();

	type Mark = { name: string; number: number; x: number; y: number; w: number; h: number };

	// Parts register as they initialise, in the order they are written. That
	// order is not reactive state, as a child can't write its parent's state
	// while rendering; `revision` is bumped after, so numbers re-read it.
	const names: string[] = [];
	let revision = $state(0);
	// Names marked in the component with no Part, numbered after the Parts.
	let extra = $state<string[]>([]);
	let marks = $state<Mark[]>([]);
	let active = $state<string | undefined>();
	let hidden = $state(false);

	let stage: HTMLDivElement;
	let content: HTMLDivElement;

	const touch = () =>
		queueMicrotask(() => {
			revision += 1;
			// A Part added after mount: its parts move from unmatched to numbered.
			if (resize) schedule();
		});

	function numberOf(name: string): number | undefined {
		void revision;
		const at = names.indexOf(name);
		if (at >= 0) return at + 1;
		const after = extra.indexOf(name);
		return after >= 0 ? names.length + after + 1 : undefined;
	}

	setAnatomy({
		register(name) {
			names.push(name);
			touch();
			return () => {
				const at = names.indexOf(name);
				if (at >= 0) names.splice(at, 1);
				touch();
			};
		},
		numberOf,
		get active() {
			return active;
		},
		set active(name) {
			active = name;
		}
	});

	// Names already warned about, so a warning shows once. Never rendered.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const warned = new Set<string>();

	/** Where each marked part is now, relative to the stage. */
	function measure() {
		if (!stage || !content) return;
		const origin = stage.getBoundingClientRect();
		const elements = [...content.querySelectorAll<HTMLElement>('[data-part]')];
		const found: string[] = [];
		const next: Mark[] = [];
		for (const element of elements) {
			const name = element.dataset.part?.trim();
			if (!name) continue;
			if (!found.includes(name)) found.push(name);
			const box = element.getBoundingClientRect();
			// Hidden right now (closed, collapsed): nothing to point at.
			if (box.width === 0 && box.height === 0) continue;
			next.push({
				name,
				number: 0,
				x: box.left - origin.left,
				y: box.top - origin.top,
				w: box.width,
				h: box.height
			});
		}
		const unmatched = found.filter((name) => !names.includes(name));
		const nextExtra = [...extra.filter((name) => unmatched.includes(name))];
		for (const name of unmatched) if (!nextExtra.includes(name)) nextExtra.push(name);
		if (nextExtra.join('\n') !== extra.join('\n')) extra = nextExtra;
		for (const mark of next) mark.number = numberOf(mark.name) ?? 0;
		marks = next;
		observeParts(elements);

		if (DEV) {
			for (const name of unmatched) {
				if (warned.has(name)) continue;
				warned.add(name);
				console.warn(
					`[svelte-docsmith] <Anatomy>: data-part="${name}" has no <Part name="${name}">, so it is labelled but not described.`
				);
			}
		}
	}

	// Measuring is cheap but layout is not, so at most once a frame. A change
	// can animate, so after one the labels follow for a moment longer.
	let frame = 0;
	let until = 0;
	function schedule(follow = 0) {
		until = Math.max(until, performance.now() + follow);
		if (frame) return;
		frame = requestAnimationFrame(function tick() {
			frame = 0;
			measure();
			if (performance.now() < until) frame = requestAnimationFrame(tick);
		});
	}

	let resize: ResizeObserver | undefined;
	let observed = new Set<Element>();
	function observeParts(elements: Element[]) {
		if (!resize) return;
		const now = new Set<Element>([stage, content, ...elements]);
		for (const element of observed) if (!now.has(element)) resize.unobserve(element);
		for (const element of now) if (!observed.has(element)) resize.observe(element);
		observed = now;
	}

	onMount(() => {
		resize = new ResizeObserver(() => schedule());
		const mutation = new MutationObserver(() => schedule(400));
		mutation.observe(content, {
			subtree: true,
			childList: true,
			attributes: true,
			characterData: true
		});
		const follow = () => schedule(400);
		const events = ['transitionrun', 'transitionend', 'animationstart', 'animationend'] as const;
		for (const type of events) content.addEventListener(type, follow);
		content.addEventListener('scroll', follow, { capture: true, passive: true });
		window.addEventListener('resize', follow);
		measure();

		if (DEV) {
			const missing = names.filter((name) => !content.querySelector(partSelector(name)));
			for (const name of missing) {
				console.warn(
					`[svelte-docsmith] <Anatomy>: <Part name="${name}"> matches no data-part="${name}" in the component, so it has no label.`
				);
			}
		}

		return () => {
			cancelAnimationFrame(frame);
			resize?.disconnect();
			mutation.disconnect();
			for (const type of events) content.removeEventListener(type, follow);
			content.removeEventListener('scroll', follow, { capture: true });
			window.removeEventListener('resize', follow);
		};
	});

	function partSelector(name: string): string {
		return `[data-part="${CSS.escape(name)}"]`;
	}

	// One label per part, on its first element; every element gets an outline.
	// A label sits on its part's top-left corner. Parts often share a corner (a
	// box and the first thing in it), so a label that would sit on one already
	// placed moves along the top edge to the right.
	const LABEL = 22;
	const labelled = $derived.by(() => {
		const placed: Mark[] = [];
		for (const mark of marks) {
			if (placed.some((other) => other.name === mark.name)) continue;
			let x = Math.max(LABEL / 2, mark.x);
			const y = Math.max(LABEL / 2, mark.y);
			while (placed.some((o) => Math.abs(o.x - x) < LABEL && Math.abs(o.y - y) < LABEL)) {
				x += LABEL + 2;
			}
			placed.push({ ...mark, x, y });
		}
		return placed;
	});
</script>

<figure class="docsmith-anatomy not-prose">
	<div class="anatomy-stage" bind:this={stage}>
		<div class="anatomy-content" bind:this={content}>
			{@render children()}
		</div>
		{#if !hidden}
			<div class="anatomy-overlay" aria-hidden="true">
				{#each marks as mark, i (i)}
					<span
						class="anatomy-box"
						class:anatomy-active={active === mark.name}
						style:left="{mark.x}px"
						style:top="{mark.y}px"
						style:width="{mark.w}px"
						style:height="{mark.h}px"
					></span>
				{/each}
				{#each labelled as mark (mark.name)}
					<span
						class="anatomy-label"
						class:anatomy-active={active === mark.name}
						style:left="{mark.x}px"
						style:top="{mark.y}px">{mark.number}</span
					>
				{/each}
			</div>
		{/if}
	</div>
	<div class="anatomy-bar">
		<button
			type="button"
			class="anatomy-toggle"
			aria-pressed={hidden}
			onclick={() => (hidden = !hidden)}
		>
			Hide labels
		</button>
	</div>
	{#if parts}
		<ol class="anatomy-parts">
			{@render parts()}
		</ol>
	{/if}
</figure>

<style>
	.docsmith-anatomy {
		margin: 1.5rem 0;
	}
	.anatomy-stage {
		position: relative;
		display: flex;
		justify-content: center;
		padding: 2.5rem 2rem;
		border: 1px solid var(--border);
		border-bottom: 0;
		border-radius: var(--radius, 0.5rem) var(--radius, 0.5rem) 0 0;
		background: color-mix(in oklch, var(--muted) 30%, transparent);
	}
	.anatomy-content {
		max-width: 100%;
	}

	/* The overlay never takes a click: the component under it stays usable. */
	.anatomy-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.anatomy-box {
		position: absolute;
		border: 1px dashed color-mix(in oklch, var(--primary) 55%, transparent);
		border-radius: 0.25rem;
		transition: background-color 120ms;
	}
	.anatomy-box.anatomy-active {
		border-style: solid;
		border-color: var(--primary);
		background: color-mix(in oklch, var(--primary) 10%, transparent);
	}
	.anatomy-label {
		position: absolute;
		display: grid;
		place-items: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.3rem;
		transform: translate(-50%, -50%);
		border-radius: 9999px;
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 0.7rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		box-shadow: 0 0 0 2px var(--background);
	}
	.anatomy-label.anatomy-active {
		box-shadow:
			0 0 0 2px var(--background),
			0 0 0 4px var(--primary);
	}

	.anatomy-bar {
		display: flex;
		justify-content: flex-end;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 0 0 var(--radius, 0.5rem) var(--radius, 0.5rem);
		background: color-mix(in oklch, var(--muted) 50%, transparent);
	}
	.anatomy-toggle {
		padding: 0.25rem 0.6rem;
		border-radius: calc(var(--radius, 0.5rem) - 2px);
		color: var(--muted-foreground);
		font-size: 0.8rem;
		font-weight: 500;
	}
	.anatomy-toggle:hover {
		background: var(--accent);
		color: var(--accent-foreground);
	}
	.anatomy-toggle[aria-pressed='true'] {
		color: var(--foreground);
		background: var(--accent);
	}
	.anatomy-toggle:focus-visible {
		outline: 2px solid var(--ring, var(--primary));
		outline-offset: 2px;
	}

	.anatomy-parts {
		display: grid;
		gap: 0.25rem;
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
	}
</style>
