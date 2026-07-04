<script lang="ts">
	import { cn } from '$lib/shadcn.js';
	import type { HighlightedTocItem } from '$lib/toc/index.js';
	import List from '@lucide/svelte/icons/list';

	const { items = [], class: className = '' }: { items?: HighlightedTocItem[]; class?: string } =
		$props();
</script>

{#snippet TocList(tocItems: HighlightedTocItem[], listClass: string = '')}
	{#if tocItems.length > 0}
		<ul class={cn('space-y-0.5', listClass)}>
			{#each tocItems as item (item.url)}
				<li>
					<a
						href={item.url}
						class={cn(
							'text-muted-foreground hover:text-foreground block truncate py-1.5 text-sm transition-colors duration-200',
							{
								'text-primary font-medium': item.isFocused,
								'text-foreground': item.hasFocusedChildren
							}
						)}
					>
						{item.title}
					</a>
				</li>

				{#if item.items?.length > 0}
					{@render TocList(item.items, 'ml-0.5 border-l border-border pl-4')}
				{/if}
			{/each}
		</ul>
	{/if}
{/snippet}

{#if items.length > 0}
	<aside class={cn('sticky top-24 hidden w-56 shrink-0 self-start lg:block', className)}>
		<nav class="pr-4">
			<div
				class="border-border text-foreground flex items-center gap-2 border-b pb-3 text-sm font-semibold"
			>
				<List class="size-4" />
				<span>On this page</span>
			</div>
			<div class="mt-3 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2">
				{@render TocList(items)}
			</div>
		</nav>
	</aside>
{/if}
