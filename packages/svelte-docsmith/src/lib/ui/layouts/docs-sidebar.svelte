<script lang="ts">
	import { page } from '$app/state';
	import { ScrollArea } from '$lib/ui/shadcn/scroll-area/index.js';
	import * as Sidebar from '$lib/ui/shadcn/sidebar/index.js';
	import type { NavGroup } from '$lib/config.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';

	const { title, nav }: { title: string; nav: NavGroup[] } = $props();
</script>

<Sidebar.Root variant="sidebar" class="p-0 border-none">
	<Sidebar.Header class="h-14 pl-4">
		<a href="/" class="text-lg font-bold h-full gap-2 flex items-center">
			<BookOpenText class="text-primary size-6" />
			{title}
		</a>
	</Sidebar.Header>
	<Sidebar.Content>
		<ScrollArea>
			{#each nav as group (group.title)}
				<Sidebar.Group>
					<Sidebar.GroupLabel>{group.title}</Sidebar.GroupLabel>
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							{#each group.items as item (item.url)}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton isActive={page.url.pathname === item.url}>
										{#snippet child({ props }: { props: Record<string, unknown> })}
											<a href={item.url} {...props}>{item.title}</a>
										{/snippet}
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/each}
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Sidebar.Group>
			{/each}
		</ScrollArea>
	</Sidebar.Content>
</Sidebar.Root>
