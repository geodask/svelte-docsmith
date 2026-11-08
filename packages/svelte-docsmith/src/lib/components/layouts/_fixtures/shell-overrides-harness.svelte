<script lang="ts">
	// Test-only harness: renders DocsShell with whichever overrides a test asks
	// for, each one printing what it received so the test can check it. Pruned
	// from the package via `_fixtures`.
	import type { DocsContentItem } from '#lib/core/index.js';
	import DocsShell from '../docs-shell.svelte';
	import Sidebar from '../sidebar.svelte';
	import type {
		PageHeaderProps,
		PagerProps,
		SidebarProps,
		TableOfContentsProps
	} from '../parts.js';

	type Override = 'sidebar' | 'toc' | 'pageHeader' | 'pager' | 'wrapSidebar';

	let {
		content,
		overrides = [],
		layout = 'docs',
		copyPage = false,
		readingTime = true
	}: {
		content: DocsContentItem[];
		overrides?: Override[];
		layout?: 'docs' | 'page';
		copyPage?: boolean;
		readingTime?: boolean;
	} = $props();

	const has = (name: Override) => overrides.includes(name);
</script>

{#snippet sidebar({ nav }: SidebarProps)}
	<p data-testid="sidebar-override">{nav.map((group) => group.title).join(',')}</p>
{/snippet}

{#snippet wrapSidebar(props: SidebarProps)}
	<p data-testid="sidebar-banner">Banner</p>
	<Sidebar {...props} />
{/snippet}

{#snippet toc({ items, activeId }: TableOfContentsProps)}
	<p data-testid="toc-override">{items.map((item) => item.id).join(',')}|{activeId}</p>
{/snippet}

{#snippet pageHeader(props: PageHeaderProps)}
	<p data-testid="page-header-override">
		{props.path}|{props.breadcrumbs
			.map((crumb) => crumb.title)
			.join('>')}|{props.readingMinutes}|{props.copyPage}
	</p>
{/snippet}

{#snippet pager({ prev, next }: PagerProps)}
	<p data-testid="pager-override">{prev?.title}|{next?.title}</p>
{/snippet}

<DocsShell
	{content}
	{layout}
	{copyPage}
	{readingTime}
	sidebar={has('wrapSidebar') ? wrapSidebar : has('sidebar') ? sidebar : undefined}
	toc={has('toc') ? toc : undefined}
	pageHeader={has('pageHeader') ? pageHeader : undefined}
	pager={has('pager') ? pager : undefined}
>
	<h1>Page</h1>
</DocsShell>
