<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { navFromContent, type DocsContentItem, type DocsmithConfig } from '$lib/config.js';
	import { createToc } from '$lib/toc/index.js';
	import BackgroundPattern from '../background-pattern.svelte';
	import ThemeProvider from '../theme-provider.svelte';
	import DocsHeader from './docs-header.svelte';
	import DocsFooter from './docs-footer.svelte';
	import DocsMobileHeader from './docs-mobile-header.svelte';
	import DocsSidebar from './docs-sidebar.svelte';
	import PrevNextNav from './prev-next-nav.svelte';
	import Breadcrumbs, { type Crumb } from './breadcrumbs.svelte';
	import TableOfContents from '../table-of-contents.svelte';
	import type { Snippet } from 'svelte';

	const {
		config,
		content = [],
		children,
		logo,
		actions,
		footer,
		pattern = false,
		layout = 'docs'
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
		/**
		 * `docs` (default): the three-column shell — sidebar, content, in-page TOC.
		 * `page`: full-bleed content with the same header/footer/background but no
		 * sidebar or TOC — for a landing or any non-doc page, so the whole site
		 * shares one chrome.
		 */
		layout?: 'docs' | 'page';
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

	// Breadcrumb trail: the current page's sidebar group, then the page itself.
	const currentGroup = $derived(
		nav.find((group) => group.items.some((item) => item.url === page.url.pathname))
	);
	const breadcrumbs = $derived.by(() => {
		const crumbs: Crumb[] = [];
		if (currentGroup) crumbs.push({ title: currentGroup.title });
		if (pageIndex >= 0) crumbs.push({ title: currentTitle });
		return crumbs;
	});

	// In-page TOC, scanned from the rendered content and re-scanned after every
	// navigation (client-side included) so it never goes stale.
	let contentEl = $state<HTMLElement | null>(null);
	const toc = createToc(() => contentEl);
	afterNavigate(() => {
		toc.refresh();
	});

	// Server-rendered TOC (headings extracted at build time into the content
	// index) so the list is present on first paint. Once the client engine has
	// scanned the DOM, its items take over (scroll-spy + edge-case accuracy).
	const pageToc = $derived(content.find((item) => item.path === page.url.pathname)?.toc ?? []);
	const tocItems = $derived(toc.items.length ? toc.items : pageToc);
</script>

<div class="relative isolate flex min-h-screen flex-col">
	<!-- Owns light/dark for the whole app — consumers never wire mode-watcher. -->
	<ThemeProvider />

	{#if pattern}
		<BackgroundPattern />
	{/if}

	{#if layout === 'page'}
		<DocsHeader {config} {logo} {actions} standalone />

		<main class="flex-1">
			{@render children()}
		</main>
	{:else}
		<DocsHeader {config} {logo} {actions} />

		<DocsMobileHeader
			{config}
			{nav}
			title={currentTitle}
			tocItems={toc.items}
			tocActiveId={toc.activeId}
			{logo}
			{actions}
		/>

		<div class="mx-auto flex w-full max-w-7xl flex-1 gap-12 px-4 md:px-6 lg:px-8 lg:pt-10">
			<DocsSidebar {nav} />

			<main bind:this={contentEl} class="min-w-0 flex-1 py-6 lg:py-0">
				<Breadcrumbs items={breadcrumbs} />
				{@render children()}
				<PrevNextNav {prev} {next} />
			</main>

			<!-- Reserve the TOC column so its content filling in after hydration
			     never shifts the page. -->
			<div class="hidden w-56 shrink-0 lg:block">
				<TableOfContents items={tocItems} activeId={toc.activeId} />
			</div>
		</div>
	{/if}

	{#if footer}
		{@render footer()}
	{:else if config.footer}
		<DocsFooter {config} />
	{/if}
</div>
