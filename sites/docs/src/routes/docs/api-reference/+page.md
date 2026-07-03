---
title: API Reference
description: Components, helpers, and types exported by svelte-docsmith.
section: Reference
order: 1
---

## Assembled experience

The fast path — import and compose.

### DocsShell

The full documentation shell: header, sidebar, content area, and table of
contents.

```svelte
<DocsShell {config} content={docs}>
	{@render children()}
</DocsShell>
```

| Prop       | Type                | Description                                                  |
| ---------- | ------------------- | ------------------------------------------------------------ |
| `config`   | `DocsmithConfig`    | Site title, GitHub URL, optional version.                    |
| `content`  | `DocsContentItem[]` | Your content collection; the sidebar nav is derived from it. |
| `children` | `Snippet`           | The rendered page.                                           |

### DocPage

The markdown page layout — breadcrumb plus a `prose` container. Used as the
mdsvex layout for individual pages.

### TableOfContents

Renders a highlighted, nested list of the current page's headings. `DocsShell`
wires this for you; export it if you compose your own shell.

### Tabs / TabItem

Tabbed content blocks for grouping alternatives (e.g. package managers).

## Parts for customisers

Compose your own shell from the primitives:

- `reactiveToc(items, contentEl, options?)` — the scroll-tracking engine.
- `tocFromContent(element)` — build the heading tree from rendered content.
- `navFromContent(content)` — group content entries into sidebar sections.
- `useClipboard()` — copy-to-clipboard helper used by the code block chrome.
- `reactiveBreadcrumb()` / `setupReactiveBreadcrumb()` — breadcrumb state.
- `markdown` — the per-element renderer map (`pre`, `code`, `h2`, `h3`).

## Types

`DocsmithConfig`, `DocsContentItem`, `NavGroup`, `NavItem`, `HighlightedTocItem`,
`WithChildren`.

The vendored shadcn primitives are intentionally **not** exported — get those
from `shadcn-svelte` directly.
