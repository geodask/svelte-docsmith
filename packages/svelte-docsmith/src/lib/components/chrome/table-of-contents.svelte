<script lang="ts">
	import { cn } from '$lib/utils/cn.js';
	import type { TocItem } from '$lib/toc/index.js';
	import List from '@lucide/svelte/icons/list';

	const {
		items = [],
		activeId = null,
		class: className = ''
	}: {
		items?: TocItem[];
		activeId?: string | null;
		class?: string;
	} = $props();

	// The single primary marker slides along the rail to the active entry. We
	// measure the active anchor's box and animate the marker to it.
	let railEl = $state<HTMLElement | null>(null);
	let markerTop = $state(0);
	let markerHeight = $state(0);
	// Gate the transition so the first placement snaps instead of sliding in.
	let animate = $state(false);

	$effect(() => {
		const id = activeId;
		void items; // re-measure when the heading set changes
		if (!railEl || !id) {
			markerHeight = 0;
			return;
		}
		const target = railEl.querySelector<HTMLElement>(`[data-toc-id="${CSS.escape(id)}"]`);
		if (!target) {
			markerHeight = 0;
			return;
		}
		markerTop = target.offsetTop;
		markerHeight = target.offsetHeight;
		if (!animate) requestAnimationFrame(() => (animate = true));
	});
</script>

{#if items.length > 0}
	<aside class={cn('sticky top-24 self-start', className)}>
		<nav aria-label="On this page" class="pr-2">
			<p class="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
				<List class="size-4" />
				On this page
			</p>
			<div bind:this={railEl} class="toc-rail max-h-[calc(100vh-16rem)] overflow-y-auto text-sm">
				<span
					class="toc-marker"
					class:toc-marker-animate={animate}
					style="transform: translateY({markerTop}px); height: {markerHeight}px; opacity: {markerHeight >
					0
						? 1
						: 0};"
					aria-hidden="true"
				></span>
				<ul>
					{#each items as item (item.id)}
						<li>
							<a
								href="#{item.id}"
								data-toc-id={item.id}
								aria-current={activeId === item.id ? 'location' : undefined}
								class={cn(
									'text-muted-foreground hover:text-foreground block py-1.5 pl-4 leading-snug transition-colors duration-150',
									item.depth === 3 && 'pl-8',
									activeId === item.id && 'text-primary font-medium'
								)}
							>
								{item.title}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</nav>
	</aside>
{/if}

<style>
	/* The faint full-height rail; the marker is the bright segment on top of it. */
	.toc-rail {
		position: relative;
		border-left: 1px solid var(--border);
	}
	.toc-rail ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.toc-marker {
		position: absolute;
		left: -1px;
		top: 0;
		width: 2px;
		border-radius: 1px;
		background: var(--primary);
		/* Placement is set inline; only animate once past the first frame. */
		will-change: transform, height;
	}
	.toc-marker-animate {
		transition:
			transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
			height 280ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 160ms ease;
	}
	@media (prefers-reduced-motion: reduce) {
		.toc-marker-animate {
			transition: opacity 160ms ease;
		}
	}
</style>
