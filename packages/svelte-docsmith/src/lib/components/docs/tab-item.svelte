<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import * as TabsPrimitive from '$lib/components/shadcn/tabs/index.js';
	import { TABS_PHASE, getTabsContext, type TabsPhase } from './tabs.svelte';

	const {
		label,
		value: valueProp,
		children
	}: {
		/** The trigger text for this tab. */
		label: string;
		/** Underlying value; defaults to `label` (only needed to disambiguate duplicate labels). */
		value?: string;
		children: Snippet;
	} = $props();

	const value = $derived(valueProp ?? label);
	const phase = getContext<TabsPhase>(TABS_PHASE);

	// Register once, during the collect pass, so <Tabs> can pick the default tab.
	// svelte-ignore state_referenced_locally
	if (phase === 'collect') getTabsContext()?.register(value);
</script>

{#if phase === 'list'}
	<!-- bits-ui v2 emits data-state="active"; the vendored trigger styles the
	     active state with data-active (a skew from the CLI's registry version),
	     so paint the active state here to match what's actually emitted. -->
	<TabsPrimitive.Trigger
		{value}
		class="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
	>
		{label}
	</TabsPrimitive.Trigger>
{:else if phase === 'panel'}
	<TabsPrimitive.Content {value}>
		{@render children()}
	</TabsPrimitive.Content>
{/if}
