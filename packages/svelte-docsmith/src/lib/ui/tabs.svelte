<script lang="ts">
	import * as Tabs from '$lib/ui/shadcn/tabs/index.js';
	import type { WithChildren } from '$lib/types.js';

	type TabsProps = {
		items: string[];
		value: string;
	};

	const { children, items, value = items[0] }: WithChildren<TabsProps> = $props();
</script>

<Tabs.Root class="my-6" {value}>
	<Tabs.List class="not-prose mb-3">
		{#each items as item (item)}
			<Tabs.Trigger value={item}>{item}</Tabs.Trigger>
		{/each}
	</Tabs.List>

	{@render children()}
</Tabs.Root>
