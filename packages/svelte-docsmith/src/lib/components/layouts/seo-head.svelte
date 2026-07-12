<script lang="ts">
	import { page } from '$app/state';
	import { normalizePath } from '$lib/utils/normalize-path.js';
	import type { DocsmithConfig } from '$lib/core/index.js';

	const {
		config,
		title,
		description
	}: {
		config: DocsmithConfig;
		/** The page's own title (frontmatter or override); omit for the site root. */
		title?: string;
		/** The page's own description; falls back to `config.description`. */
		description?: string;
	} = $props();

	// "Page · Site", or just the site title when they would duplicate (the home page).
	const fullTitle = $derived(
		title && title !== config.title ? `${title} · ${config.title}` : config.title
	);
	const ogTitle = $derived(title ?? config.title);
	const metaDescription = $derived(description ?? config.description);

	const origin = $derived(config.url?.replace(/\/$/, ''));
	// Absolute URLs need a configured origin; otherwise canonical/og:url are omitted.
	const canonical = $derived(origin ? origin + normalizePath(page.url.pathname) : undefined);
	const image = $derived.by(() => {
		const src = config.ogImage;
		if (!src) return undefined;
		if (/^https?:\/\//.test(src)) return src;
		return origin ? origin + '/' + src.replace(/^\//, '') : src;
	});
</script>

<svelte:head>
	<title>{fullTitle}</title>
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
	<meta property="og:site_name" content={config.title} />
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
