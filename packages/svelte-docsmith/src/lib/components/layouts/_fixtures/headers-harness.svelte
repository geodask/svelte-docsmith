<script lang="ts">
	// Test-only harness: publishes a resolved page view the way DocsShell does
	// and renders both headers over it, so a test can check they agree. Pruned
	// from the package via `_fixtures`.
	import type { DocsPageView } from '#lib/core/index.js';
	import { setDocsPage } from '../../docs-page-context.js';
	import DocsHeader from '../docs-header.svelte';
	import DocsMobileHeader from '../docs-mobile-header.svelte';

	let { view }: { view: DocsPageView } = $props();

	setDocsPage(() => view);
</script>

<DocsHeader />
<DocsMobileHeader sidebar />
