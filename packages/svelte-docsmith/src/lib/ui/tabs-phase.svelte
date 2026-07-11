<script lang="ts">
	// Internal to <Tabs>. bits-ui renders the trigger row (Tabs.List) and the
	// panels (Tabs.Content) as separate subtrees, but authors write a single flat
	// list of <TabItem>s. So <Tabs> renders that list three times through this
	// wrapper — once per phase — and each <TabItem> reads the phase to decide what
	// to emit: `collect` registers its value (no DOM), `list` renders a trigger,
	// `panel` renders the content. Doing it in render (not an effect) keeps the
	// first tab selected server-side, with no post-hydration pop-in.
	import { setContext, type Snippet } from 'svelte';
	import { TABS_PHASE, type TabsPhase } from './tabs.svelte';

	const { phase, children }: { phase: TabsPhase; children: Snippet } = $props();

	// phase is fixed for the lifetime of each scope instance.
	// svelte-ignore state_referenced_locally
	setContext<TabsPhase>(TABS_PHASE, phase);
</script>

{@render children()}
