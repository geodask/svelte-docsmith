<script lang="ts">
	import * as Tabs from '$lib/ui/shadcn/tabs/index.js';
	import type { WithChildren } from '$lib/types.js';

	type TabsProps = {
		items: string[];
		value: string;
	};

	const { children, items, value = items[0] }: WithChildren<TabsProps> = $props();
</script>

<Tabs.Root class="border border-muted dark:border-secondary p-2 rounded-lg" {value}>
	<Tabs.List class="shadow-md ">
		{#each items as item (item)}
			<Tabs.Trigger value={item}>{item}</Tabs.Trigger>
		{/each}
	</Tabs.List>

	{@render children()}
</Tabs.Root>
