---
title: API Reference
description: The public API exported by svelte-docsmith.
section: Reference
order: 30
---

<script>
	import { PropsTable, Prop, Callout } from 'svelte-docsmith';
</script>

## Entry points

| Entry point                    | Exports                                                                                                                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `svelte-docsmith`              | `DocsShell`, `ThemeProvider`, `ThemeToggle`, `LiveExample`, `Tabs`, `TabItem`, `Callout`, `Steps`, `Step`, `Card`, `CardGrid`, `Accordion`, `AccordionItem`, `Badge`, `Kbd`, `FileTree`, `FileTreeItem`, `PropsTable`, `Prop`, `defineConfig`, types |
| `svelte-docsmith/preprocess`   | `docsmith()`, the mdsvex/Shiki preprocessor (Node, config time)                                                                                                                                                                                      |
| `svelte-docsmith/vite`         | `docsmith()`, the content index + `?source` transform (Node, build time)                                                                                                                                                                             |
| `svelte-docsmith/content`      | `docs`, the generated sidebar content index                                                                                                                                                                                                          |
| `svelte-docsmith/theme.css`    | the base style contract                                                                                                                                                                                                                              |
| `svelte-docsmith/themes/*.css` | pre-installed theme presets (`darkmatter`, `tangerine`, `amethyst`, `graphite`, `evergreen`, `rose`, `ocean`, `nord`, `claude`, `bubblegum`, `mono`)                                                                                                 |

## Components

### DocsShell

The full documentation shell: header, sidebar, content area, and table of
contents.

```svelte
<DocsShell {config} content={docs}>
	{@render children()}
</DocsShell>
```

<PropsTable title="DocsShell">
	<Prop name="config" type="DocsmithConfig" required>
		Site title, GitHub URL, optional version.
	</Prop>
	<Prop name="content" type="DocsContentItem[]" required>
		The content index; the sidebar nav is derived from it.
	</Prop>
	<Prop name="children" type="Snippet" required>
		The rendered page.
	</Prop>
	<Prop name="logo" type="Snippet">
		Custom logo mark for the header and mobile menu.
	</Prop>
	<Prop name="actions" type="Snippet">
		Extra header controls, before the theme toggle.
	</Prop>
	<Prop name="footer" type="Snippet">
		Content rendered below the page column.
	</Prop>
	<Prop name="pattern" type="boolean" default="false">
		Render the decorative grid-and-glow page background.
	</Prop>
	<Prop name="layout" type="'docs' | 'page'" default="'docs'">
		<code>docs</code> is the three-column shell; <code>page</code> is
		full-bleed content with the same header and footer but no sidebar or TOC,
		for a landing or any non-doc page.
	</Prop>
</PropsTable>

<Callout type="note" title="Theming needs no setup">

`ThemeProvider` and `ThemeToggle` handle light and dark with no consumer wiring.
`DocsShell` mounts the provider internally, so you never touch `mode-watcher`
yourself. Use `ThemeProvider` directly to wrap a page you build outside
`DocsShell`.

</Callout>

### Docs components

Authored inside markdown or any `.svelte` file: `Callout`, `Steps` + `Step`,
`Card` + `CardGrid`, `Accordion` + `AccordionItem`, `Tabs` + `TabItem`,
`FileTree` + `FileTreeItem`, `PropsTable` + `Prop`, `Badge`, `Kbd`, and
`LiveExample`. See the [Components](/docs/components/callout) section for each
one's props and a live demo.

### LiveExample

Renders a real component next to its own syntax-highlighted source. See
[Live Examples](/docs/live-examples).

<PropsTable title="LiveExample">
	<Prop name="children" type="Snippet" required>
		The live, rendered component.
	</Prop>
	<Prop name="source" type="string" required>
		Pre-highlighted source HTML. Pass a <code>?source</code> import.
	</Prop>
</PropsTable>

### Tabs / TabItem

Tabbed content blocks for grouping alternatives such as package managers.
`items` lists the tab labels; each `TabItem`'s `value` matches one label.

```svelte
<Tabs items={['npm', 'pnpm']} value="npm">
	<TabItem value="npm">…</TabItem>
	<TabItem value="pnpm">…</TabItem>
</Tabs>
```

<PropsTable title="Tabs">
	<Prop name="items" type="string[]" required>
		Tab labels, in order.
	</Prop>
	<Prop name="value" type="string">
		Initially selected label. Defaults to the first.
	</Prop>
</PropsTable>

<PropsTable title="TabItem">
	<Prop name="value" type="string" required>
		The label this panel belongs to.
	</Prop>
</PropsTable>

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

- **`DocsmithConfig`**: `title` (required), plus optional `github`, `version`,
  `logo`, `nav` (header links), and `footer` (copyright and link columns).
- **`DocsContentItem`**: a content-index entry with `title`, `path`, and optional
  `section`, `order`, and `description`.

The vendored shadcn primitives and internal helpers (the TOC engine, the
clipboard utility, the markdown renderer map) are **not** part of the public API
and may change between releases.
