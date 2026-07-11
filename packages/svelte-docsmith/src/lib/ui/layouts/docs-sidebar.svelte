<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/shadcn.js';
	import { normalizePath } from '$lib/normalize-path.js';
	import type { NavGroup } from '$lib/config.js';

	const { nav, class: className = '' }: { nav: NavGroup[]; class?: string } = $props();
</script>

<aside class={cn('sticky top-24 hidden h-screen w-56 shrink-0 bg-transparent lg:block', className)}>
	<div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4">
		<nav class="space-y-6">
			{#each nav as group (group.title)}
				<div class="space-y-3">
					<h4 class="text-foreground px-2 text-sm font-semibold">{group.title}</h4>
					<ul class="space-y-1">
						{#each group.items as item (item.url)}
							<li>
								<a
									href={item.url}
									class={cn(
										'hover:text-primary hover:bg-primary/20 block rounded-md px-2 py-1.5 text-sm transition-colors',
										normalizePath(page.url.pathname) === item.url
											? 'text-primary bg-primary/20 font-medium'
											: 'text-muted-foreground'
									)}
								>
									{item.title}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</nav>
	</div>
</aside>
