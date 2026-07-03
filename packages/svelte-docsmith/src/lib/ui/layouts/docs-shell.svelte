<script lang="ts">
	import { page } from '$app/state';
	import { navFromContent, type DocsContentItem, type DocsmithConfig } from '$lib/config.js';
	import { reactiveToc, tocFromContent, type TocItem } from '$lib/toc/index.js';
	import DocsHeader from './docs-header.svelte';
	import DocsSidebar from './docs-sidebar.svelte';
	import TableOfContents from '../table-of-contents.svelte';
	import * as Sidebar from '$lib/ui/shadcn/sidebar/index.js';
	import type { Snippet } from 'svelte';

	const {
		config,
		content = [],
		children
	}: {
		config: DocsmithConfig;
		content?: DocsContentItem[];
		children: Snippet;
	} = $props();

	const nav = $derived(navFromContent(content));

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

<Sidebar.Provider>
	<DocsSidebar title={config.title} {nav} />
	<Sidebar.Inset>
		<DocsHeader {config} />
		<main class="flex-1 px-8 py-6" bind:this={contentEl}>
			{@render children()}
		</main>
		<TableOfContents items={toc.items} />
	</Sidebar.Inset>
</Sidebar.Provider>
