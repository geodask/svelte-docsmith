<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import {
		navFromContent,
		type DocsContentItem,
		type DocsmithConfig,
		type SearchDoc
	} from '$lib/core/index.js';
	import { createToc } from '$lib/toc/index.js';
	import { createSearchState } from '$lib/search/context.svelte.js';
	import { normalizePath } from '$lib/utils/normalize-path.js';
	import Search from '../chrome/search.svelte';
	import BackgroundPattern from '../chrome/background-pattern.svelte';
	import ThemeProvider from '../chrome/theme-provider.svelte';
	import DocsHeader from './docs-header.svelte';
	import DocsFooter from './docs-footer.svelte';
	import DocsMobileHeader from './docs-mobile-header.svelte';
	import DocsSidebar from './docs-sidebar.svelte';
	import PrevNextNav from './prev-next-nav.svelte';
	import Breadcrumbs, { type Crumb } from './breadcrumbs.svelte';
	import CopyPageMenu from './copy-page-menu.svelte';
	import PageFeedback from './page-feedback.svelte';
	import SeoHead from './seo-head.svelte';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import TableOfContents from '../chrome/table-of-contents.svelte';
	import type { Snippet } from 'svelte';

	const {
		config,
		content = [],
		children,
		logo,
		actions,
		footer,
		search,
		seo,
		pattern = false,
		copyPage = false,
		readingTime = true,
		feedback,
		layout = 'docs'
	}: {
		config: DocsmithConfig;
		content?: DocsContentItem[];
		children: Snippet;
		/**
		 * Override the head tags for this page. Doc pages get their `<title>` and
		 * description from frontmatter automatically; use this on non-doc pages
		 * (the landing page, custom routes) or to override.
		 */
		seo?: { title?: string; description?: string };
		/**
		 * Enable the ⌘K search palette by lazily providing the generated index,
		 * e.g. `search={() => import('svelte-docsmith/search').then((m) => m.docs)}`.
		 * Omit to hide search. The index is fetched only when search first opens.
		 */
		search?: () => Promise<SearchDoc[]>;
		/** Custom logo mark for the header and mobile menu. */
		logo?: Snippet;
		/** Extra header controls (desktop and mobile), before the theme toggle. */
		actions?: Snippet;
		/** Rendered below the content column (copyright, credits, …). */
		footer?: Snippet;
		/** Render the decorative grid-and-glow page background. */
		pattern?: boolean;
		/**
		 * Show the "Copy page" split button on doc pages: copy the page as
		 * Markdown, view the raw `.md`, or open it in ChatGPT / Claude. Requires a
		 * catch-all `<path>.md` endpoint over the `svelte-docsmith/llms` index.
		 */
		copyPage?: boolean;
		/**
		 * Show the estimated reading time on doc pages (computed at build time).
		 * Defaults to `true`; set `false` to hide it.
		 */
		readingTime?: boolean;
		/**
		 * Show the "Was this page helpful?" widget at the foot of doc pages. Pass
		 * `true` for the UI alone, or a callback `(vote, path) => void` to also
		 * record votes (wire it to your analytics). Omit to hide it.
		 */
		feedback?: boolean | ((vote: 'up' | 'down', path: string) => void);
		/**
		 * `docs` (default): the three-column shell — sidebar, content, in-page TOC.
		 * `page`: full-bleed content with the same header/footer/background but no
		 * sidebar or TOC — for a landing or any non-doc page, so the whole site
		 * shares one chrome.
		 */
		layout?: 'docs' | 'page';
	} = $props();

	// Publish search state on context so the header triggers and the single
	// dialog share one open-state; only when the consumer wired an index. The
	// `search` loader is static for the shell's lifetime, so reading it once at
	// init is intentional.
	// svelte-ignore state_referenced_locally
	if (search) createSearchState();

	const nav = $derived(navFromContent(content));

	// Match content by a trailing-slash-normalized path, so `/docs/intro/` and
	// `/docs/intro` resolve to the same page regardless of the app's trailingSlash.
	const pathname = $derived(normalizePath(page.url.pathname));

	// The content entry for the current route drives the SEO title/description,
	// the "Edit this page" link, and the "Last updated" stamp.
	const currentEntry = $derived(content.find((item) => item.path === pathname));

	const editHref = $derived(
		config.editUrl && currentEntry?.sourcePath
			? config.editUrl.replace(/\/$/, '') + '/' + currentEntry.sourcePath
			: undefined
	);
	const lastUpdatedLabel = $derived.by(() => {
		const iso = currentEntry?.lastUpdated;
		if (!iso) return undefined;
		const d = new Date(iso);
		return Number.isNaN(d.getTime())
			? undefined
			: new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' }).format(
					d
				);
	});
	const showFooterMeta = $derived(Boolean(editHref || lastUpdatedLabel));

	const readingTimeLabel = $derived(
		readingTime && currentEntry?.readingTime ? `${currentEntry.readingTime} min read` : undefined
	);

	// Ordered flat page list drives the prev/next links.
	const flatNav = $derived(nav.flatMap((group) => group.items));
	const pageIndex = $derived(flatNav.findIndex((item) => item.url === pathname));
	const prev = $derived(pageIndex > 0 ? flatNav[pageIndex - 1] : undefined);
	const next = $derived(
		pageIndex >= 0 && pageIndex < flatNav.length - 1 ? flatNav[pageIndex + 1] : undefined
	);
	const currentTitle = $derived(pageIndex >= 0 ? flatNav[pageIndex].title : config.title);

	// Breadcrumb trail: the current page's sidebar group, then the page itself.
	const currentGroup = $derived(
		nav.find((group) => group.items.some((item) => item.url === pathname))
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
	const pageToc = $derived(content.find((item) => item.path === pathname)?.toc ?? []);
	const tocItems = $derived(toc.items.length ? toc.items : pageToc);
</script>

<SeoHead
	{config}
	title={seo?.title ?? currentEntry?.title}
	description={seo?.description ?? currentEntry?.description}
/>

<div class="relative isolate flex min-h-screen flex-col">
	<!-- Keyboard skip link: first focusable element, visible only on focus. -->
	<a
		href="#main-content"
		class="bg-primary text-primary-foreground focus-visible:ring-ring sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:ring-2"
	>
		Skip to content
	</a>

	<!-- Owns light/dark for the whole app — consumers never wire mode-watcher. -->
	<ThemeProvider />

	{#if search}
		<Search load={search} />
	{/if}

	{#if pattern}
		<BackgroundPattern />
	{/if}

	<!-- One header system everywhere: DocsHeader on desktop, DocsMobileHeader
	     below lg. The `page` layout just omits the sidebar nav and in-page TOC. -->
	<DocsHeader {config} {logo} {actions} />

	{#if layout === 'page'}
		<DocsMobileHeader {config} {logo} {actions} />

		<main id="main-content" tabindex="-1" class="flex-1">
			{@render children()}
		</main>
	{:else}
		<DocsMobileHeader
			{config}
			{nav}
			title={currentTitle}
			{tocItems}
			tocActiveId={toc.activeId}
			{logo}
			{actions}
		/>

		<div class="mx-auto flex w-full max-w-7xl flex-1 gap-12 px-4 md:px-6 lg:px-8 lg:pt-10">
			<DocsSidebar {nav} />

			<main
				bind:this={contentEl}
				id="main-content"
				tabindex="-1"
				class="min-w-0 flex-1 py-6 lg:py-0"
			>
				<div class="flex items-start justify-between gap-4">
					<Breadcrumbs items={breadcrumbs} />
					<div class="flex shrink-0 items-center gap-3">
						{#if readingTimeLabel}
							<span class="text-muted-foreground text-sm whitespace-nowrap">
								{readingTimeLabel}
							</span>
						{/if}
						{#if copyPage && currentEntry}
							<CopyPageMenu path={pathname} origin={config.url ?? ''} />
						{/if}
					</div>
				</div>
				{@render children()}

				{#if showFooterMeta}
					<div
						class="text-muted-foreground border-border mt-10 flex flex-wrap items-center gap-3 border-t pt-6 text-sm"
					>
						{#if editHref}
							<a
								href={editHref}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
							>
								<SquarePen class="size-4" />
								Edit this page
							</a>
						{/if}
						{#if lastUpdatedLabel}
							<span class="ml-auto">Last updated: {lastUpdatedLabel}</span>
						{/if}
					</div>
				{/if}

				{#if feedback && currentEntry}
					{#key pathname}
						<div class="mt-8">
							<PageFeedback
								path={pathname}
								onfeedback={typeof feedback === 'function' ? feedback : undefined}
							/>
						</div>
					{/key}
				{/if}

				<PrevNextNav {prev} {next} bordered={!showFooterMeta} />
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
