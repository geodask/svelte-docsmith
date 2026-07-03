<script lang="ts">
	import * as Tabs from '$lib/ui/shadcn/tabs/index.js';
	import type { WithChildren } from '$lib/types.js';

	type TabsItemProps = {
		value: string;
	};

	const { children, value }: WithChildren<TabsItemProps> = $props();
</script>

<Tabs.Content {value}>
	{@render children()}
</Tabs.Content>
