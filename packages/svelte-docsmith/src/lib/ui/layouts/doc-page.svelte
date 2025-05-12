<script lang="ts" module>
	export { code, h2, h3, pre } from '../markdown';
</script>

<script lang="ts">
	import { reactiveBreadcrumb, type BreadcrumbItem } from '$shared/lib/breadcrumb.svelte';
	import { cn } from '$shared/lib/shadcn';
	import * as Breadcrumb from '$shared/ui/shadcn/breadcrumb';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();

	const breadcrumb = reactiveBreadcrumb();
</script>

{#snippet BreacrumbContent(item: BreadcrumbItem)}
	{#if item.icon}
		{@const Icon = item.icon}
		<Icon class="size-5" />
	{/if}
	{item.title}
{/snippet}

<Breadcrumb.Root class="mb-8">
	<Breadcrumb.List class="text-base">
		{#each breadcrumb.items as item}
			<Breadcrumb.Item>
				{#if item.href}
					<Breadcrumb.Link href={item.href}>
						{@render BreacrumbContent(item)}
					</Breadcrumb.Link>
				{:else}
					<Breadcrumb.Page
						class={cn({
							'text-muted-foreground': item === breadcrumb.items[breadcrumb.items.length - 1]
						})}
					>
						{@render BreacrumbContent(item)}
					</Breadcrumb.Page>
				{/if}
			</Breadcrumb.Item>
			{#if item !== breadcrumb.items[breadcrumb.items.length - 1]}
				<Breadcrumb.Separator />
			{/if}
		{/each}
	</Breadcrumb.List>
</Breadcrumb.Root>

<div class="prose prose-base max-w-none relative dark:prose-invert pb-10">
	{@render children()}
</div>
