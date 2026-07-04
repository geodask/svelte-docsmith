---
title: API Reference
description: The public API exported by svelte-docsmith.
section: Reference
order: 6
---

## Entry points

| Entry point                  | Exports                                                               |
| ---------------------------- | --------------------------------------------------------------------- |
| `svelte-docsmith`            | `DocsShell`, `LiveExample`, `Tabs`, `TabItem`, `defineConfig`, types  |
| `svelte-docsmith/preprocess` | `docsmith()` — the mdsvex/Shiki pipeline (Node, config time)          |
| `svelte-docsmith/vite`       | `docsmith()` — content index + `?source` transform (Node, build time) |
| `svelte-docsmith/content`    | `docs` — the generated sidebar content index                          |
| `svelte-docsmith/theme.css`  | the style contract                                                    |

## Components

### DocsShell

The full documentation shell: header, sidebar, content area, and table of
contents.

```svelte
<DocsShell {config} content={docs}>
	{@render children()}
</DocsShell>
```

| Prop       | Type                | Description                                            |
| ---------- | ------------------- | ------------------------------------------------------ |
| `config`   | `DocsmithConfig`    | Site title, GitHub URL, optional version.              |
| `content`  | `DocsContentItem[]` | The content index; the sidebar nav is derived from it. |
| `children` | `Snippet`           | The rendered page.                                     |

### LiveExample

Renders a real component next to its own syntax-highlighted source — see
[Live Examples](/docs/live-examples).

### Tabs / TabItem

Tabbed content blocks for grouping alternatives (e.g. package managers).

## Config

### defineConfig

Validates a `DocsmithConfig` and returns it unchanged, throwing a clear error on
an invalid or dynamically-built config.

```ts
const config = defineConfig({
	title: 'My Library',
	github: 'https://github.com/you/my-library',
	version: '1.0.0'
});
```

## Types

`DocsmithConfig` (site config) and `DocsContentItem` (a content-index entry:
`title`, `path`, optional `section`/`order`/`description`).

The vendored shadcn primitives and internal helpers (the TOC engine, the
clipboard utility, the markdown renderer map) are **not** part of the public API
and may change between releases.
