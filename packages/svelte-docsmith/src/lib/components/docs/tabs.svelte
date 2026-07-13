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
	import { syncedValue, setSyncedValue, hydrateSyncedValue } from './tabs-sync.svelte.js';

	const {
		value,
		syncKey,
		children
	}: {
		/** Value/label of the tab selected by default. Defaults to the first tab. */
		value?: string;
		/**
		 * Sync group. Every `<Tabs>` with the same `syncKey` shares its selection
		 * (e.g. `"pkg"` for npm/pnpm/yarn blocks), and the choice is remembered
		 * across reloads and navigation.
		 */
		syncKey?: string;
		children: Snippet;
	} = $props();

	// Each <TabItem> registers its value during the collect pass, which renders
	// (below) before <Tabs.Root> reads them — so the right panel is already
	// selected in the server-rendered HTML. The first registered value is the
	// default; the full list validates a restored sync choice against this block.
	let values = $state<string[]>([]);
	setContext<TabsContext>(TABS_CTX, {
		register: (v) => {
			if (!values.includes(v)) values.push(v);
		}
	});
	const firstValue = $derived<string | undefined>(values[0]);

	// Restore a persisted selection after mount (client-only), so it does not
	// diverge from the server's default render until hydration is done. `ready`
	// gates persistence until then, so any value event the tab primitive fires
	// while mounting can't overwrite the reader's stored choice before we read it.
	let ready = $state(false);
	$effect(() => {
		if (syncKey) hydrateSyncedValue(syncKey);
		ready = true;
	});

	// A restored sync choice (valid for this block) wins, then the explicit
	// `value`, then the first tab. Reactive, so a sibling group's change or a
	// storage restore switches this instance too.
	const selected = $derived.by(() => {
		const fallback = value ?? firstValue ?? '';
		if (!syncKey) return fallback;
		const stored = syncedValue(syncKey);
		return stored && values.includes(stored) ? stored : fallback;
	});

	function handleValueChange(next: string) {
		if (ready && syncKey && next) setSyncedValue(syncKey, next);
	}
</script>

<!-- collect: registers each TabItem's value; renders nothing. -->
<TabsPhaseScope phase="collect">{@render children()}</TabsPhaseScope>

<TabsPrimitive.Root value={selected} onValueChange={handleValueChange} class="my-6">
	<TabsPrimitive.List class="not-prose mb-3">
		<TabsPhaseScope phase="list">{@render children()}</TabsPhaseScope>
	</TabsPrimitive.List>
	<TabsPhaseScope phase="panel">{@render children()}</TabsPhaseScope>
</TabsPrimitive.Root>
