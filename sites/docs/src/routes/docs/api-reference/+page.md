---
title: API Reference
description: The public API exported by svelte-docsmith.
section: Reference
order: 8
---

## Entry points

| Entry point                    | Exports                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `svelte-docsmith`              | `DocsShell`, `ThemeProvider`, `ThemeToggle`, `LiveExample`, `Tabs`, `TabItem`, `Callout`, `Steps`, `Step`, `Card`, `CardGrid`, `defineConfig`, types |
| `svelte-docsmith/preprocess`   | `docsmith()` — the mdsvex/Shiki preprocessor (Node, config time)                                                                                     |
| `svelte-docsmith/vite`         | `docsmith()` — content index + `?source` transform (Node, build time)                                                                                |
| `svelte-docsmith/content`      | `docs` — the generated sidebar content index                                                                                                         |
| `svelte-docsmith/theme.css`    | the base style contract                                                                                                                              |
| `svelte-docsmith/themes/*.css` | pre-installed theme presets (`tangerine`, `amethyst`, `graphite`, `evergreen`, `rose`, `ocean`)                                                      |

## Components

### DocsShell

The full documentation shell: header, sidebar, content area, and table of
contents.

```svelte
<DocsShell {config} content={docs}>
	{@render children()}
</DocsShell>
```

| Prop       | Type                | Description                                                                                                                           |
| ---------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `config`   | `DocsmithConfig`    | Site title, GitHub URL, optional version.                                                                                             |
| `content`  | `DocsContentItem[]` | The content index; the sidebar nav is derived from it.                                                                                |
| `children` | `Snippet`           | The rendered page.                                                                                                                    |
| `logo`     | `Snippet`           | Optional custom logo mark for the header and mobile menu.                                                                             |
| `actions`  | `Snippet`           | Optional extra header controls, before the theme toggle.                                                                              |
| `footer`   | `Snippet`           | Optional content rendered below the page column.                                                                                      |
| `pattern`  | `boolean`           | Render the decorative grid-and-glow page background.                                                                                  |
| `layout`   | `'docs' \| 'page'`  | `docs` = the three-column shell; `page` = full-bleed content, same header/footer, no sidebar/TOC (for a landing or any non-doc page). |

`ThemeProvider` and `ThemeToggle` handle light/dark with no consumer setup —
`DocsShell` mounts the provider internally, so you never wire `mode-watcher`
yourself. Use `ThemeProvider` to wrap a page you build outside `DocsShell`.

### Docs components

Authored inside markdown (or any `.svelte` file): `Callout` (`type`:
note/tip/warning/danger), `Steps` + `Step` (numbered walkthrough), `Card` +
`CardGrid` (linkable cards), `Tabs` + `TabItem`, and `LiveExample`. See the
[Components](/docs/components/callout) section for each one's props and live
examples.

### LiveExample

Renders a real component next to its own syntax-highlighted source — see
[Live Examples](/docs/live-examples).

| Prop       | Type      | Description                                            |
| ---------- | --------- | ------------------------------------------------------ |
| `children` | `Snippet` | The live, rendered component.                          |
| `source`   | `string`  | Pre-highlighted source HTML — pass a `?source` import. |

### Tabs / TabItem

Tabbed content blocks for grouping alternatives (e.g. package managers). `items`
lists the tab labels; each `TabItem`'s `value` matches one label.

```svelte
<Tabs items={['npm', 'pnpm']} value="npm">
	<TabItem value="npm">…</TabItem>
	<TabItem value="pnpm">…</TabItem>
</Tabs>
```

| Component | Prop    | Type       | Description                                  |
| --------- | ------- | ---------- | -------------------------------------------- |
| `Tabs`    | `items` | `string[]` | Tab labels, in order.                        |
| `Tabs`    | `value` | `string`   | Initially selected label. Defaults to first. |
| `TabItem` | `value` | `string`   | The label this panel belongs to.             |

## Config

### defineConfig

Validates a `DocsmithConfig` and returns it unchanged, throwing a clear error on
an invalid or dynamically-built config instead of rendering a blank header.

```ts
const config = defineConfig({
	title: 'My Library',
	github: 'https://github.com/you/my-library',
	version: '1.0.0'
});
```

## Types

- **`DocsmithConfig`** — `title` (required), and optional `github`, `version`,
  `logo`, `nav` (header links), `footer` (copyright + link columns).
- **`DocsContentItem`** — a content-index entry: `title`, `path`, and optional
  `section` / `order` / `description`.

The vendored shadcn primitives and internal helpers (the TOC engine, the
clipboard utility, the markdown renderer map) are **not** part of the public API
and may change between releases.
