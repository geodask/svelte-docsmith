<script lang="ts">
	import { page } from '$app/state';
	import { navFromContent, type DocsContentItem, type DocsmithConfig } from '$lib/config.js';
	import { reactiveToc, tocFromContent, type TocItem } from '$lib/toc/index.js';
	import BackgroundPattern from '../background-pattern.svelte';
	import DocsHeader from './docs-header.svelte';
	import DocsMobileHeader from './docs-mobile-header.svelte';
	import DocsSidebar from './docs-sidebar.svelte';
	import PrevNextNav from './prev-next-nav.svelte';
	import TableOfContents from '../table-of-contents.svelte';
	import type { Snippet } from 'svelte';

	const {
		config,
		content = [],
		children,
		logo,
		actions,
		footer,
		pattern = false
	}: {
		config: DocsmithConfig;
		content?: DocsContentItem[];
		children: Snippet;
		/** Custom logo mark for the header and mobile menu. */
		logo?: Snippet;
		/** Extra header controls (desktop and mobile), before the theme toggle. */
		actions?: Snippet;
		/** Rendered below the content column (copyright, credits, …). */
		footer?: Snippet;
		/** Render the decorative grid-and-glow page background. */
		pattern?: boolean;
	} = $props();

	const nav = $derived(navFromContent(content));

	// Ordered flat page list drives the prev/next links.
	const flatNav = $derived(nav.flatMap((group) => group.items));
	const pageIndex = $derived(flatNav.findIndex((item) => item.url === page.url.pathname));
	const prev = $derived(pageIndex > 0 ? flatNav[pageIndex - 1] : undefined);
	const next = $derived(
		pageIndex >= 0 && pageIndex < flatNav.length - 1 ? flatNav[pageIndex + 1] : undefined
	);
	const currentTitle = $derived(pageIndex >= 0 ? flatNav[pageIndex].title : config.title);

	// Build the in-page TOC from the rendered content after each navigation.
	let contentEl = $state<HTMLElement | null>(null);
	let tocItems = $state<TocItem[]>([]);

	$effect(() => {
		page.url.pathname; // re-run when the route changes
		if (!contentEl) return;
		tocItems = tocFromContent(contentEl);
	});

	const toc = reactiveToc(
		() => tocItems,
		() => contentEl
	);
</script>

<div class="relative isolate flex min-h-screen flex-col">
	{#if pattern}
		<BackgroundPattern />
	{/if}

	<DocsHeader {config} {logo} {actions} />

	<DocsMobileHeader {config} {nav} title={currentTitle} tocItems={toc.items} {logo} {actions} />

	<div class="mx-auto flex w-full max-w-7xl flex-1 gap-12 px-4 md:px-6 lg:px-8 lg:pt-10">
		<DocsSidebar {nav} />

		<main bind:this={contentEl} class="min-w-0 flex-1 py-6 lg:py-0">
			{@render children()}
			<PrevNextNav {prev} {next} />
		</main>

		<TableOfContents items={toc.items} />
	</div>

	{#if footer}
		{@render footer()}
	{/if}
</div>
