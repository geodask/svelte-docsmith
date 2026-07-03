<script lang="ts">
	import { page } from '$app/state';
	import { ScrollArea, Sidebar } from 'svelte-docsmith/internal';
	import { BookOpenText } from '@lucide/svelte';
	import type { ComponentProps } from 'svelte';
	import { data } from '$lib/nav';

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root variant="sidebar" class="p-0 border-none" {...restProps} bind:ref>
	<Sidebar.Header class="h-14 pl-4">
		<a href="/" class="text-lg font-bold h-full gap-2 flex items-center">
			<BookOpenText class="text-primary size-6" />
			Svelte DocSmith
		</a>
	</Sidebar.Header>
	<Sidebar.Content>
		<ScrollArea>
			<!-- We create a Sidebar.Group for each parent. -->
			{#each data.navMain as group (group.title)}
				<Sidebar.Group>
					<Sidebar.GroupLabel>{group.title}</Sidebar.GroupLabel>
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							{#each group.items as item (item.title)}
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
