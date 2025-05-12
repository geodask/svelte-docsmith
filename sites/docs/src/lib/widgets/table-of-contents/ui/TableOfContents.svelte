<script lang="ts">
	import { cn } from '$shared/lib/shadcn.js';
	import type { HighlightedTocItem } from '$shared/lib/toc';
	import { List } from '@lucide/svelte';

	// Component props - single array of highlighted TOC items
	const { items = [] }: { items: HighlightedTocItem[] } = $props();
</script>

<div class="fixed z-20 lg:w-[16rem] right-8 top-20 hidden lg:block">
	<div class="font-semibold flex items-center gap-2">
		<List class="size-5" />
		On this page
	</div>
	<div class="text-sm mt-3 pl-1">
		{@render TocList(items)}
	</div>
</div>

{#snippet TocList(items: HighlightedTocItem[], className: string = '')}
	{#if items.length > 0}
		<ul class={cn('space-y-1', className)}>
			{#each items as item (item.url)}
				<li>
					<a
						href={item.url}
						class={cn(
							'py-2 h-8 flex flex-1 text-foreground items-center truncate transition-all duration-300 rounded-lg',
							{
								// Primary style for focused item (most visible)
								'text-primary font-semibold bg-primary/10 px-2 -translate-x-4': item.isFocused,
								'text-primary font-semibold': item.hasFocusedChildren
							}
						)}
					>
						{item.title}
					</a>
				</li>

				{#if item.items?.length > 0}
					{@render TocList(item.items, 'pl-5')}
				{/if}
			{/each}
		</ul>
	{/if}
{/snippet}
