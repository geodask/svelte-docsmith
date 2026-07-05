<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	export type Crumb = { title: string; url?: string };

	const { items = [] }: { items?: Crumb[] } = $props();
</script>

{#if items.length > 1}
	<nav aria-label="Breadcrumb" class="mb-5">
		<ol class="flex flex-wrap items-center gap-1.5 text-sm">
			{#each items as crumb, i (crumb.title + i)}
				{@const isLast = i === items.length - 1}
				<li class="flex items-center gap-1.5">
					{#if i > 0}
						<ChevronRight class="text-muted-foreground/50 size-3.5 shrink-0" aria-hidden="true" />
					{/if}
					{#if crumb.url && !isLast}
						<a
							href={crumb.url}
							class="text-muted-foreground hover:text-foreground rounded transition-colors"
						>
							{crumb.title}
						</a>
					{:else}
						<span
							class={isLast ? 'text-foreground font-medium' : 'text-muted-foreground'}
							aria-current={isLast ? 'page' : undefined}
						>
							{crumb.title}
						</span>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>
{/if}
