<script lang="ts">
	// Test-only harness: publishes a resolved page view the way DocsShell does
	// and renders the head over it. Pruned from the package via `_fixtures`.
	import type { DocsPageView } from '#lib/core/index.js';
	import { setDocsPage } from '../../docs-page-context.js';
	import SeoHead from '../seo-head.svelte';

	let { view, title, description }: { view: DocsPageView; title?: string; description?: string } =
		$props();

	setDocsPage(() => view);
</script>

<SeoHead {title} {description} />
