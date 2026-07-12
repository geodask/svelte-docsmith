<script lang="ts" module>
	import { getContext } from 'svelte';

	/** Which render pass a <TabItem> is in. See tabs-phase.svelte. */
	export type TabsPhase = 'collect' | 'list' | 'panel';

	export const TABS_PHASE = Symbol('docsmith-tabs-phase');
	const TABS_CTX = Symbol('docsmith-tabs-ctx');

	type TabsContext = {
		/** Called by each <TabItem> during the collect pass, in document order. */
		register: (value: string) => void;
	};

	/** Read the enclosing <Tabs> context from a <TabItem>. */
	export function getTabsContext(): TabsContext | undefined {
		return getContext<TabsContext | undefined>(TABS_CTX);
	}
</script>

<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import * as TabsPrimitive from '$lib/components/shadcn/tabs/index.js';
	import TabsPhaseScope from './tabs-phase.svelte';

	const {
		value,
		children
	}: {
		/** Value/label of the tab selected by default. Defaults to the first tab. */
		value?: string;
		children: Snippet;
	} = $props();

	// The first <TabItem> to register wins the default selection. Captured during
	// the collect pass, which renders (below) before <Tabs.Root> reads it — so the
	// correct panel is already selected in the server-rendered HTML.
	let firstValue = $state<string | undefined>();
	setContext<TabsContext>(TABS_CTX, {
		register: (v) => (firstValue ??= v)
	});
</script>

<!-- collect: registers each TabItem's value; renders nothing. -->
<TabsPhaseScope phase="collect">{@render children()}</TabsPhaseScope>

<TabsPrimitive.Root value={value ?? firstValue ?? ''} class="my-6">
	<TabsPrimitive.List class="not-prose mb-3">
		<TabsPhaseScope phase="list">{@render children()}</TabsPhaseScope>
	</TabsPrimitive.List>
	<TabsPhaseScope phase="panel">{@render children()}</TabsPhaseScope>
</TabsPrimitive.Root>
