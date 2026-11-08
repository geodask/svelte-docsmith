<script lang="ts">
	import { site } from 'svelte-docsmith/site';
	import { join } from '#lib/utils/url.js';
	import { useDocsPage } from '../docs-page-context.js';

	const {
		title: titleOverride,
		description: descriptionOverride
	}: {
		/** Override the page's title; doc pages default to their frontmatter title. */
		title?: string;
		/** Override the page's description; doc pages default to their frontmatter's. */
		description?: string;
	} = $props();

	// The page itself (its entry, canonical URL and version) comes off the shell's
	// one resolved view, so the head can't describe a different page than the
	// body renders, and no caller can forget to pass the canonical.
	const docsPage = useDocsPage();
	const title = $derived(titleOverride ?? docsPage.view.entry?.title);
	const canonical = $derived(docsPage.view.canonicalUrl);
	// Keep a version explicitly marked hidden out of search results.
	const noindex = $derived(Boolean(docsPage.view.activeVersion?.noindex));

	// "Page · Site", or just the site title when they would duplicate (the home page).
	const fullTitle = $derived(
		title && title !== site.title ? `${title} · ${site.title}` : site.title
	);
	const ogTitle = $derived(title ?? site.title);
	const metaDescription = $derived(
		descriptionOverride ?? docsPage.view.entry?.description ?? site.description
	);

	// A doc page's own OG image when the site serves them, else the site's one.
	const image = $derived.by(() => {
		const entry = docsPage.view.entry;
		const src = site.ogImages && entry ? `${join(site.ogImages, entry.path)}.png` : site.ogImage;
		if (!src) return undefined;
		if (/^https?:\/\//.test(src)) return src;
		return site.url ? join(site.url, src) : src;
	});
</script>

<svelte:head>
	<title>{fullTitle}</title>
	{#if noindex}
		<!-- Keep this version out of search results; still follow its links. -->
		<meta name="robots" content="noindex, follow" />
	{/if}
	{#if metaDescription}
		<meta name="description" content={metaDescription} />
	{/if}
	{#if canonical}
		<link rel="canonical" href={canonical} />
	{/if}

	<meta property="og:title" content={ogTitle} />
	{#if metaDescription}
		<meta property="og:description" content={metaDescription} />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={site.title} />
	{#if canonical}
		<meta property="og:url" content={canonical} />
	{/if}
	{#if image}
		<meta property="og:image" content={image} />
	{/if}

	<meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={ogTitle} />
	{#if metaDescription}
		<meta name="twitter:description" content={metaDescription} />
	{/if}
	{#if image}
		<meta name="twitter:image" content={image} />
	{/if}
</svelte:head>
