---
title: Overrides
description: Replace the sidebar, table of contents, page header or pager with your own markup.
section: Core Concepts
order: 15
---

<script>
	import { PropsTable, Prop, Callout } from 'svelte-docsmith';
</script>

`DocsShell` draws four parts of every doc page itself: the sidebar, the table of
contents, the page header (breadcrumbs, reading time and Copy page) and the
pager (the previous and next links). Pass a snippet to replace any of them. Each
snippet is an **override**: it receives what its part shows, and the shell keeps
the part's place on the page.

```svelte title="src/routes/docs/+layout.svelte"
<script lang="ts">
	import { content } from 'svelte-docsmith/content';
	import { DocsShell } from 'svelte-docsmith';

	const { children } = $props();
</script>

<DocsShell {content}>
	{#snippet pager({ prev, next })}
		<nav aria-label="Pagination" class="flex justify-between">
			{#if prev}<a href={prev.url}>← {prev.title}</a>{/if}
			{#if next}<a href={next.url} class="ml-auto">{next.title} →</a>{/if}
		</nav>
	{/snippet}

	{@render children()}
</DocsShell>
```

## Wrap the built-in part

Each built-in part is exported and takes exactly the object its snippet
receives, so an override can add to the default instead of rebuilding it. Spread
the props on and put your own markup around it:

```svelte
<script lang="ts">
	import { content } from 'svelte-docsmith/content';
	import { DocsShell, Sidebar } from 'svelte-docsmith';
	import SponsorCard from '$lib/sponsor-card.svelte';

	const { children } = $props();
</script>

<DocsShell {content}>
	{#snippet sidebar(props)}
		<Sidebar {...props} />
		<SponsorCard />
	{/snippet}

	{@render children()}
</DocsShell>
```

## A table of contents and a page header

The same pattern works for the other two. This keeps only the `h2` headings in
the table of contents, and puts a "Report an issue" link beside the built-in
page header:

```svelte
<script lang="ts">
	import { content } from 'svelte-docsmith/content';
	import { DocsShell, PageHeader, TableOfContents } from 'svelte-docsmith';

	const { children } = $props();
</script>

<DocsShell {content}>
	{#snippet toc({ items, activeId })}
		<TableOfContents items={items.filter((item) => item.depth === 2)} {activeId} />
	{/snippet}

	{#snippet pageHeader(props)}
		<PageHeader {...props} />
		{#if props.breadcrumbs.length}
			<a href="https://github.com/me/my-lib/issues/new?title={props.path}">Report an issue</a>
		{/if}
	{/snippet}

	{@render children()}
</DocsShell>
```

## The four overrides

<PropsTable>
	<Prop name="sidebar" type="Snippet<[SidebarProps]>">
		Receives <code>{'{ nav }'}</code>: the sidebar tree for the version being read, in
		reading order, as <code>NavGroup[]</code>. A group's <code>items</code> are pages
		(<code>{'{ title, url }'}</code>) or nested groups; tell them apart with
		<code>isNavGroup</code>. Built-in: <code>Sidebar</code>.
	</Prop>
	<Prop name="toc" type="Snippet<[TableOfContentsProps]>">
		Receives <code>{'{ items, activeId }'}</code>: the page's <code>h2</code> and
		<code>h3</code> headings (<code>{'{ id, title, depth }'}</code>) and the
		<code>id</code> of the one in view, or <code>null</code>. Built-in:
		<code>TableOfContents</code>.
	</Prop>
	<Prop name="pageHeader" type="Snippet<[PageHeaderProps]>">
		Receives <code>{'{ path, breadcrumbs, readingMinutes, copyPage }'}</code>: the
		current path, the trail to the page (its groups, then the page itself without a
		<code>url</code>), the reading time in minutes (absent with
		<code>readingTime={'{false}'}</code>) and whether to offer Copy page. Built-in:
		<code>PageHeader</code>.
	</Prop>
	<Prop name="pager" type="Snippet<[PagerProps]>">
		Receives <code>{'{ prev, next }'}</code>: the previous and next pages in reading
		order, each <code>{'{ title, url }'}</code> or absent. Built-in: <code>Pager</code>.
	</Prop>
</PropsTable>

The types are exported too: `SidebarProps`, `TableOfContentsProps`,
`PageHeaderProps` and `PagerProps`, and what they carry, `NavGroup`, `NavItem`,
`NavNode`, `Breadcrumb` and `TocItem`.

## What the shell keeps

An override replaces what's inside a part, not where it sits. The shell keeps
the sticky sidebar and table-of-contents columns, their widths and the point
where they collapse, and the rule above the pager. On small screens the sidebar
override fills the menu and the table-of-contents override fills the "On this
page" popover, so one override covers both. The popover only appears on pages
with headings.

The archived-version banner, the edit link and last-updated row, and the
feedback widget stay the shell's. The site header takes the `logo` and
`actions` snippets, and the footer the `footer` snippet (see
[DocsShell](/docs/configuration#docsshell)).

<Callout variant="note" title="The page layout has none of these parts">

With `layout="page"` the shell draws no sidebar, table of contents, page header
or pager, so those overrides are ignored there.

</Callout>
