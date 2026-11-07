---
title: How it works
description: The content model, the markdown pipeline, and navigation.
section: Core Concepts
order: 4
---

<script>
	import { Callout, FileTree, FileTreeItem } from 'svelte-docsmith';
</script>

## Markdown as routes

DocSmith leans on mdsvex, which compiles markdown into real Svelte components. A
file becomes a page by its position on disk, with no loader and no catch-all
route:

<FileTree>
	<FileTreeItem name="src" folder>
		<FileTreeItem name="routes" folder>
			<FileTreeItem name="docs" folder>
				<FileTreeItem name="guides" folder>
					<FileTreeItem name="routing" folder>
						<FileTreeItem name="+page.md" highlight />
					</FileTreeItem>
				</FileTreeItem>
			</FileTreeItem>
		</FileTreeItem>
	</FileTreeItem>
</FileTree>

The file above serves `/docs/guides/routing`. Because it is a normal SvelteKit
route, you can drop interactive Svelte components straight into the markdown and
they run as part of the same app.

## One plugin, one config

Everything DocSmith does at build time comes from one `docsmith()` call in
`vite.config.ts`, from `svelte-docsmith/vite`:

- It **compiles each `.md` file** into a styled, highlighted page (mdsvex,
  Shiki, heading anchors, the page layout) before SvelteKit compiles it like
  any component.
- It **generates the content index** (below), the search and llms indexes, and
  the `?source` and `?props` imports that power live examples and props tables.
- It **serves your site config** as `svelte-docsmith/site`, where `DocsShell`,
  `ErrorPage` and the route handlers read it.

So each setting has one home. The themes you pick colour markdown fences and
live example source alike, and the changelog route the feed links to is the one
the changelog is served at.

## Nav is derived, never written

There is no navigation array to maintain. The `docsmith()` Vite plugin reads
each page's frontmatter into the `svelte-docsmith/content` module, and
`DocsShell` groups the entries into the sidebar:

```ts
{
	title: 'How it works',
	description: 'The content model...',
	section: 'Core Concepts', // sidebar group
	order: 4                   // sort key
}
```

`section` names the group; `order` sorts entries within it; groups are ordered
by the smallest `order` they contain. Add a page, and it slots into the sidebar
in the right place automatically.

## Two tables of contents, two jobs

DocSmith keeps two structures, and they never overlap:

- The **content index** owns build-time structure. The `docsmith()` Vite plugin
  scans frontmatter into the sidebar navigation.
- The runtime **TOC engine** owns in-page scroll tracking. It scans the rendered
  headings and highlights the section you are reading.

## The highlighting pipeline

Code blocks are highlighted by [Shiki](https://shiki.style) when `docsmith()`
compiles the page, with a generous default language set. Unknown
languages fall back to plain text instead of failing the build:

```python
def greet(name: str) -> str:
    return f"Hello, {name}"
```

Highlighting is dual-theme: the same markup carries light and dark colors and
flips with the page theme, so your code reads correctly either way.
