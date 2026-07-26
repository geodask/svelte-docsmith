<script lang="ts">
	// Test-only fixture: composes <Tabs> with real <TabItem> children so the
	// context-collection (three-phase) behaviour can be exercised end to end.
	// Excluded from the published package via the `_fixtures` prune in files.
	import Tabs from '../tabs.svelte';
	import TabItem from '../tab-item.svelte';

	let { value, syncKey }: { value?: string; syncKey?: string } = $props();
</script>

<Tabs {value} {syncKey}>
	<TabItem label="npm">npm content</TabItem>
	<TabItem label="pnpm">pnpm content</TabItem>
	<TabItem label="yarn">yarn content</TabItem>
</Tabs>
