<script lang="ts">
	// Test-only harness: publishes the search context (as DocsShell does) and
	// renders the dialog plus a trigger, so a test can open the palette both by
	// the ⌘K shortcut and by a click. Pruned from the package via `_fixtures`.
	import { createSearchState } from '$lib/search/context.svelte.js';
	import Search from '../search.svelte';
	import type { SearchDoc } from '$lib/core/index.js';

	let { load }: { load: () => Promise<SearchDoc[]> } = $props();

	const state = createSearchState();
</script>

<button data-testid="open-search" onclick={() => (state.open = true)}>Open search</button>

<Search {load} />
