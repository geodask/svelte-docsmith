<script lang="ts">
	// Test-only harness: publishes the two contexts DocsShell does (search state
	// and the resolved page view) and renders the dialog plus a trigger, so a test
	// can open the palette both by the ⌘K shortcut and by a click. Pruned from the
	// package via `_fixtures`.
	import { createSearchState } from '$lib/search/context.svelte.js';
	import { setDocsPage } from '../../docs-page-context.js';
	import { resolveDocsPage, type SearchDoc } from '$lib/core/index.js';
	import Search from '../search.svelte';

	let { load }: { load: () => Promise<SearchDoc[]> } = $props();

	const state = createSearchState();

	// An unversioned site, so `activeVersionId` is undefined and search stays
	// unscoped, which is what a consumer that passes no `versions` gets.
	const view = resolveDocsPage({
		content: [],
		versions: [],
		pathname: '/docs',
		siteTitle: 'Docs'
	});
	setDocsPage(() => view);
</script>

<button data-testid="open-search" onclick={() => (state.open = true)}>Open search</button>

<Search {load} />
