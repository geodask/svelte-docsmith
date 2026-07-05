---
title: How it works
description: The content model, the markdown pipeline, and navigation.
section: Core Concepts
order: 4
---

## Markdown as routes

DocSmith leans on mdsvex, which compiles markdown into real Svelte components.
A file at `src/routes/docs/guides/routing/+page.md` becomes the page
`/docs/guides/routing` — no loader, no catch-all route. Because it is a normal
SvelteKit route, you can drop interactive Svelte components straight into the
markdown and they run as part of the same app.

## One name, two plugins

DocSmith ships two things both called `docsmith()`, imported from two entry
points. They do different jobs and you need both:

- `svelte-docsmith/preprocess` — a **Svelte preprocessor**, added in
  `svelte.config.js`. It runs at compile time and turns each `.md` file into a
  styled, highlighted page (mdsvex, Shiki, heading anchors, the page layout).
- `svelte-docsmith/vite` — a **Vite plugin**, added in `vite.config.ts`. It runs
  at build time and generates the content index (below) plus the `?source`
  transform that powers live examples.

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
in the right place — automatically.

## Two tables of contents, two jobs

DocSmith deliberately keeps two structures, and they never overlap:

- The **content index** owns build-time structure — the `docsmith()` Vite plugin
  scans frontmatter into the sidebar navigation.
- The runtime **TOC engine** owns in-page scroll tracking — it scans the
  rendered headings and highlights the section you are reading.

## The highlighting pipeline

Code blocks are highlighted by [Shiki](https://shiki.style) inside the
`docsmith()` preprocessor, with a generous default language set — and unknown
languages fall back to plain text instead of failing the build:

```python
def greet(name: str) -> str:
    return f"Hello, {name}"
```

Highlighting is dual-theme: the same markup carries light and dark colors and
flips with the page theme, so your code reads correctly either way.
