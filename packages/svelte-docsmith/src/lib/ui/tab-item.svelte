<script lang="ts">
	import * as Tabs from '$shared/ui/shadcn/tabs';
	import { ScrollArea } from './shadcn/scroll-area';

	type TabsItemProps = {
		value: string;
	};

	const { children, value }: WithChildren<TabsItemProps> = $props();
</script>

<Tabs.Content {value}>
	{@render children()}
</Tabs.Content>
