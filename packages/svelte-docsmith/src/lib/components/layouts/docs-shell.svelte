<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import {
		resolveDocsPage,
		type DocsContent,
		type DocsContentItem,
		type ResolvedVersion
	} from '#lib/core/index.js';
	import { site } from 'svelte-docsmith/site';
	import { createToc } from '#lib/toc/index.js';
	import { createSearchSession, type SearchLoader } from '#lib/search/session.svelte.js';
	import { setDocsPage } from '../docs-page-context.js';
	import { report } from '../reader-events.js';
	import Search from '../chrome/search.svelte';
	import BackgroundPattern from '../chrome/background-pattern.svelte';
	import ModeProvider from '../chrome/mode-provider.svelte';
	import AnnouncementBar from '../chrome/announcement-bar.svelte';
	import DocsHeader from './docs-header.svelte';
	import DocsFooter from './docs-footer.svelte';
	import DocsMobileHeader from './docs-mobile-header.svelte';
	import Sidebar from './sidebar.svelte';
	import Pager from './pager.svelte';
	import PageHeader from './page-header.svelte';
	import PageFeedback from './page-feedback.svelte';
	import SeoHead from './seo-head.svelte';
	import VersionBanner from '../chrome/version-banner.svelte';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import TableOfContents from '../chrome/table-of-contents.svelte';
	import type { Snippet } from 'svelte';
	import type { PageHeaderProps, PagerProps, SidebarProps, TableOfContentsProps } from './parts.js';

	const {
		content = [],
		versions = [],
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
		layout = 'docs',
		sidebar,
		toc,
		pageHeader,
		pager
	}: {
		/**
		 * The `content` export of `svelte-docsmith/content`: every page and the
		 * version manifest together. On a versioned site the sidebar, search,
		 * prev/next and breadcrumbs scope to the version being read, and once an
		 * archived version exists a header switcher and an archived-version banner
		 * appear.
		 *
		 * Still accepts the bare `docs` array, with `versions` passed beside it.
		 */
		content?: DocsContent | DocsContentItem[];
		/**
		 * @deprecated Pass the `content` export, which carries the versions with
		 * the pages. Only read when `content` is a bare `docs` array.
		 */
		versions?: ResolvedVersion[];
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
		 * Receives the active version id on a versioned site.
		 */
		search?: SearchLoader;
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
		 * With `site.mcp` set, the menu also offers "Connect to your editor".
		 */
		copyPage?: boolean;
		/**
		 * Show the estimated reading time on doc pages (computed at build time).
		 * Defaults to `true`; set `false` to hide it.
		 */
		readingTime?: boolean;
		/**
		 * Show the "Was this page helpful?" widget at the foot of doc pages. Omit
		 * to hide it. Votes reach your reader event handler (`docsmith({
		 * readerEvents })`) as `feedback` events.
		 *
		 * Passing a callback `(vote, path) => void` is deprecated: it still
		 * receives each vote until the next minor, but handle the `feedback`
		 * reader event instead.
		 */
		feedback?: boolean | ((vote: 'up' | 'down', path: string) => void);
		/**
		 * `docs` (default): the three-column shell — sidebar, content, in-page TOC.
		 * `page`: full-bleed content with the same header/footer/background but no
		 * sidebar or TOC — for a landing or any non-doc page, so the whole site
		 * shares one chrome.
		 */
		layout?: 'docs' | 'page';
		/**
		 * Override the sidebar. Receives `{ nav }`; render `<Sidebar {...props} />`
		 * inside to keep the built-in one. The shell keeps the sticky column, and
		 * the override also fills the mobile menu. Ignored with `layout="page"`.
		 */
		sidebar?: Snippet<[SidebarProps]>;
		/**
		 * Override the table of contents. Receives `{ items, activeId }`; render
		 * `<TableOfContents {...props} />` inside to keep the built-in one. The
		 * shell keeps the sticky column, and the override also fills the mobile
		 * "On this page" popover. Ignored with `layout="page"`.
		 */
		toc?: Snippet<[TableOfContentsProps]>;
		/**
		 * Override the page header, the row above the content (breadcrumbs,
		 * reading time, Copy page). Receives `{ path, breadcrumbs, readingMinutes,
		 * copyPage }`; render `<PageHeader {...props} />` inside to keep the
		 * built-in one. Ignored with `layout="page"`.
		 */
		pageHeader?: Snippet<[PageHeaderProps]>;
		/**
		 * Override the pager, the previous and next links at the foot of the page.
		 * Receives `{ prev, next }`; render `<Pager {...props} />` inside to keep
		 * the built-in one. Ignored with `layout="page"`.
		 */
		pager?: Snippet<[PagerProps]>;
	} = $props();

	// Every rule about the page being read is resolved in one pure module
	// (`core/docs-page.ts`): the active version and the content scoped to it, the
	// sidebar, the entry, prev/next, breadcrumbs, the server-rendered TOC, and the
	// chrome rules that need the site config (header links and which is active,
	// the archived banner, the issue link, the canonical URL). Reading them off
	// one view keeps the parts from disagreeing about which page or version is
	// active. What stays here is presentation: locale formatting, the
	// "min read" copy, and the live TOC.
	const view = $derived(
		resolveDocsPage({
			content: Array.isArray(content) ? content : content.docs,
			versions: Array.isArray(content) ? versions : content.versions,
			pathname: page.url.pathname,
			site
		})
	);

	// One route to the chrome. The headers, the switcher and the search palette
	// read what they need off this instead of taking it as props through two
	// intermediate layers.
	setDocsPage(() => view);

	// Publish one search session on context so the header triggers and the single
	// dialog share it; only when the consumer wired an index. It follows the
	// version being read off the same view. The `search` loader is static for the
	// shell's lifetime, so reading it once at init is intentional.
	// svelte-ignore state_referenced_locally
	if (search) {
		createSearchSession({
			load: search,
			version: () => view.activeVersionId,
			onsearch: (finished) => report({ type: 'search', path: view.pathname, ...finished })
		});
	}

	// `timeZone: 'UTC'` is not cosmetic. `lastUpdated` is a calendar day, which
	// parses to UTC midnight, so formatting in the ambient zone shifts it a day
	// west of UTC — and shifts it on the client but not on the server, so the
	// rendered date changes under hydration.
	const lastUpdatedLabel = $derived.by(() =>
		view.lastUpdated
			? new Intl.DateTimeFormat('en', {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					timeZone: 'UTC'
				}).format(view.lastUpdated)
			: undefined
	);
	const showFooterMeta = $derived(Boolean(view.editHref || lastUpdatedLabel));

	// What each overridable part receives: the same object the built-in part
	// takes as props, so an override can wrap the default.
	const sidebarProps: SidebarProps = $derived({ nav: view.nav });
	const pageHeaderProps: PageHeaderProps = $derived({
		path: view.pathname,
		breadcrumbs: view.breadcrumbs,
		readingMinutes: readingTime ? view.readingMinutes : undefined,
		since: view.entry?.since,
		copyPage: copyPage && Boolean(view.entry)
	});
	const pagerProps: PagerProps = $derived({ prev: view.prev, next: view.next });

	// In-page TOC, scanned from the rendered content and re-scanned after every
	// navigation (client-side included) so it never goes stale.
	let contentEl = $state<HTMLElement | null>(null);
	const liveToc = createToc(() => contentEl);
	afterNavigate(() => {
		liveToc.refresh();
	});

	// The build-time TOC from the content index is present on first paint; once
	// the client engine has scanned the DOM, its items take over (scroll-spy +
	// edge-case accuracy).
	const tocItems = $derived(liveToc.items.length ? liveToc.items : view.toc);
	const tocProps: TableOfContentsProps = $derived({ items: tocItems, activeId: liveToc.activeId });
</script>

<SeoHead title={seo?.title} description={seo?.description} />

<div class="relative isolate flex min-h-screen flex-col">
	<!-- Keyboard skip link: first focusable element, visible only on focus. -->
	<a
		href="#main-content"
		class="bg-primary text-primary-foreground focus-visible:ring-ring sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:ring-2"
	>
		Skip to content
	</a>

	<!-- Owns light/dark for the whole app — consumers never wire mode-watcher. -->
	<ModeProvider />

	{#if search}
		<Search />
	{/if}

	{#if pattern}
		<BackgroundPattern />
	{/if}

	<!-- Announcement bar (if configured) sits above the sticky header, so it
	     scrolls away while the header stays pinned. -->
	{#if site.announcement}
		<AnnouncementBar announcement={site.announcement} />
	{/if}

	<!-- One header system everywhere: DocsHeader on desktop, DocsMobileHeader
	     below lg. The `page` layout just omits the sidebar nav and in-page TOC. -->
	<DocsHeader {logo} {actions} />

	{#if layout === 'page'}
		<DocsMobileHeader {logo} {actions} />

		<main id="main-content" tabindex="-1" class="flex-1">
			{@render children()}
		</main>
	{:else}
		<DocsMobileHeader
			sidebar
			{tocItems}
			tocActiveId={liveToc.activeId}
			sidebarOverride={sidebar}
			tocOverride={toc}
			{logo}
			{actions}
		/>

		<div class="mx-auto flex w-full max-w-7xl flex-1 gap-12 px-4 md:px-6 lg:px-8 lg:pt-10">
			<!-- Each overridable part sits in a frame the shell keeps (the sticky
			     columns, the rule above the pager), so an override only decides
			     what goes inside. -->
			<aside class="sticky top-24 hidden h-screen w-56 shrink-0 bg-transparent lg:block">
				<div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4">
					{#if sidebar}
						{@render sidebar(sidebarProps)}
					{:else}
						<Sidebar {...sidebarProps} />
					{/if}
				</div>
			</aside>

			<main
				bind:this={contentEl}
				id="main-content"
				tabindex="-1"
				class="min-w-0 flex-1 py-6 lg:py-0"
			>
				{#if view.archivedBanner}
					<VersionBanner {...view.archivedBanner} />
				{/if}

				{#if pageHeader}
					{@render pageHeader(pageHeaderProps)}
				{:else}
					<PageHeader {...pageHeaderProps} />
				{/if}
				{@render children()}

				{#if showFooterMeta}
					<div
						class="text-muted-foreground border-border mt-10 flex flex-wrap items-center gap-3 border-t pt-6 text-sm"
					>
						{#if view.editHref}
							<a
								href={view.editHref}
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

				{#if feedback && view.entry}
					{#key view.pathname}
						<div class="mt-8">
							<PageFeedback
								path={view.pathname}
								onfeedback={typeof feedback === 'function' ? feedback : undefined}
								editHref={view.editHref}
								issueHref={view.issueHref}
							/>
						</div>
					{/key}
				{/if}

				{#if pager || view.prev || view.next}
					<!-- The edit/last-updated row already draws a rule; don't draw two. -->
					<div class={showFooterMeta ? 'mt-6' : 'border-border mt-8 border-t pt-8'}>
						{#if pager}
							{@render pager(pagerProps)}
						{:else}
							<Pager {...pagerProps} />
						{/if}
					</div>
				{/if}
			</main>

			<!-- Reserve the TOC column so its content filling in after hydration
			     never shifts the page. -->
			<div class="hidden w-56 shrink-0 lg:block">
				<div class="sticky top-24">
					{#if toc}
						{@render toc(tocProps)}
					{:else}
						<TableOfContents {...tocProps} />
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if footer}
		{@render footer()}
	{:else if site.footer}
		<DocsFooter />
	{/if}
</div>
