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
			<!-- bits-ui v2 emits data-state="active"; the vendored trigger styles the
			     active state with data-active (a skew from the CLI's registry version),
			     so paint the active state here to match what's actually emitted. -->
			<Tabs.Trigger
				value={item}
				class="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
			>
				{item}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>

	{@render children()}
</Tabs.Root>
