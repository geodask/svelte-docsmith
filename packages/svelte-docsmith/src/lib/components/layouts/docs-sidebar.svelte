<script lang="ts">
	import { page } from '$app/state';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { cn } from '$lib/utils/cn.js';
	import { normalizePath } from '$lib/utils/normalize-path.js';
	import { isNavGroup, type NavGroup, type NavNode } from '$lib/core/index.js';

	const { nav, class: className = '' }: { nav: NavGroup[]; class?: string } = $props();

	const current = $derived(normalizePath(page.url.pathname));

	// Whether a subtree contains the current page — drives which nested groups
	// start open. Recomputes on navigation, so navigating into a collapsed branch
	// (e.g. via prev/next) opens it, while manual toggles on other branches stick.
	function containsCurrent(node: NavNode): boolean {
		return isNavGroup(node) ? node.items.some(containsCurrent) : node.url === current;
	}
</script>

{#snippet tree(items: NavNode[])}
	<ul class="space-y-1">
		{#each items as node (isNavGroup(node) ? 'g:' + node.title : node.url)}
			{#if isNavGroup(node)}
				<li>
					<details class="group/nav" open={containsCurrent(node)}>
						<summary
							class="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors select-none [&::-webkit-details-marker]:hidden"
						>
							<span class="truncate">{node.title}</span>
							<ChevronRight
								class="ml-auto size-3.5 shrink-0 opacity-70 transition-transform duration-200 ease-out group-open/nav:rotate-90 motion-reduce:transition-none"
								aria-hidden="true"
							/>
						</summary>
						<div class="border-border/60 mt-1 ml-2 border-l pl-3">
							{@render tree(node.items)}
						</div>
					</details>
				</li>
			{:else}
				<li>
					<a
						href={node.url}
						aria-current={current === node.url ? 'page' : undefined}
						class={cn(
							'hover:text-primary hover:bg-primary/20 block rounded-md px-2 py-1.5 text-sm transition-colors',
							current === node.url
								? 'text-primary bg-primary/20 font-medium'
								: 'text-muted-foreground'
						)}
					>
						{node.title}
					</a>
				</li>
			{/if}
		{/each}
	</ul>
{/snippet}

<aside class={cn('sticky top-24 hidden h-screen w-56 shrink-0 bg-transparent lg:block', className)}>
	<div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4">
		<nav aria-label="Documentation" class="space-y-6">
			{#each nav as group (group.title)}
				<div class="space-y-3">
					<h4 class="text-foreground px-2 text-sm font-semibold">{group.title}</h4>
					{@render tree(group.items)}
				</div>
			{/each}
		</nav>
	</div>
</aside>
