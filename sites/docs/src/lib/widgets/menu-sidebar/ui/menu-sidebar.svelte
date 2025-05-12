<script lang="ts">
	import { page } from '$app/state';
	import * as Sidebar from '$lib/shared/ui/shadcn/sidebar';
	import { Grid2x2Check } from '@lucide/svelte';
	import type { ComponentProps } from 'svelte';
	import { data } from '../model';
	import { ScrollArea } from '$shared/ui/shadcn/scroll-area';

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

	const currentYear = new Date().getFullYear();
</script>

<Sidebar.Root variant="sidebar" class="p-0 border-none" {...restProps} bind:ref>
	<Sidebar.Header class="h-14 pl-4">
		<a href="/" class="text-lg font-bold h-full gap-2 flex items-center">
			<Grid2x2Check class="text-primary size-6" />
			Svelte Reactive Table
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
										{#snippet child({ props })}
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

	<!-- <Sidebar.Footer class="p-4">
		<p class="text-sm text-muted-foreground">
			&copy; {currentYear} George Daskalakis
		</p>
	</Sidebar.Footer> -->
</Sidebar.Root>
