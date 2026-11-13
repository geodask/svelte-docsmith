<script lang="ts">
	import { site } from 'svelte-docsmith/site';
	import { useDocsPage } from '../docs-page-context.js';

	// What the head says (the title, description, image, canonical URL and robots
	// rule) is resolved with the rest of the page in `core/docs-page.ts`, so the
	// head can't describe a different page than the body renders. This only
	// writes the tags.
	const docsPage = useDocsPage();
	const head = $derived(docsPage.view.head);
	const canonical = $derived(docsPage.view.canonicalUrl);
</script>

<svelte:head>
	<title>{head.title}</title>
	{#if head.noindex}
		<!-- Keep this version out of search results; still follow its links. -->
		<meta name="robots" content="noindex, follow" />
	{/if}
	{#if head.description}
		<meta name="description" content={head.description} />
	{/if}
	{#if canonical}
		<link rel="canonical" href={canonical} />
	{/if}

	<meta property="og:title" content={head.socialTitle} />
	{#if head.description}
		<meta property="og:description" content={head.description} />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={site.title} />
	{#if canonical}
		<meta property="og:url" content={canonical} />
	{/if}
	{#if head.image}
		<meta property="og:image" content={head.image} />
	{/if}

	<meta name="twitter:card" content={head.image ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={head.socialTitle} />
	{#if head.description}
		<meta name="twitter:description" content={head.description} />
	{/if}
	{#if head.image}
		<meta name="twitter:image" content={head.image} />
	{/if}
</svelte:head>
