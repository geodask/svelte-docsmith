<script lang="ts">
	// Test-only fixture: a <SectionCards> under a published page view, as
	// <DocsShell> would publish it. Pruned from the package via `_fixtures`.
	import type { DocsPageView } from '#lib/core/index.js';
	import { setDocsPage } from '../../docs-page-context.js';
	import SectionCards from '../section-cards.svelte';

	let { view, section }: { view: Partial<DocsPageView>; section?: string | string[] } = $props();
	setDocsPage(() => view as DocsPageView);
</script>

<SectionCards {section} />
