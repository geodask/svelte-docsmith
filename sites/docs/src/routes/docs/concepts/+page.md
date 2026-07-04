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

## Nav is derived, never written

There is no navigation array to maintain. The `docsmith()` Vite plugin reads
each page's frontmatter into the `svelte-docsmith/content` module, and
`DocsShell` groups the entries into the sidebar:

```ts
{
	title: 'How it works',
	description: 'The content model...',
	section: 'Core Concepts', // sidebar group
	order: 1                   // position within the group
}
```

`section` names the group; `order` sorts within it; groups are ordered by the
smallest `order` they contain.

## Two tables of contents, two jobs

DocSmith deliberately keeps two structures:

- The **content index** owns build-time structure — the `docsmith()` Vite plugin
  scans frontmatter into the sidebar (a search index later).
- The runtime **TOC engine** owns in-page scroll tracking: it scans the
  rendered headings and highlights the section you are reading.

## The highlighting pipeline

Code blocks are highlighted by [Shiki](https://shiki.style) inside the
`docsmith()` preprocessor, with a generous default language set — and unknown
languages fall back to plain text instead of failing the build:

```python
def greet(name: str) -> str:
    return f"Hello, {name}"
```

```yaml
title: How it works
section: Core Concepts
order: 4
```
