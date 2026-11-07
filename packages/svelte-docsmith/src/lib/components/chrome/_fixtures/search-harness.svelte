<script lang="ts">
	// Test-only harness: publishes the search session the way DocsShell does and
	// renders the dialog plus a trigger, so a test can open the palette both by
	// the ⌘K shortcut and by a click. Pruned from the package via `_fixtures`.
	import { createSearchSession, type SearchLoader } from '#lib/search/session.svelte.js';
	import Search from '../search.svelte';

	let { load }: { load: SearchLoader } = $props();

	// svelte-ignore state_referenced_locally
	const session = createSearchSession({ load });
</script>

<button data-testid="open-search" onclick={() => (session.open = true)}>Open search</button>

<Search />
