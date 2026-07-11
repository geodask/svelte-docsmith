---
'svelte-docsmith': minor
---

Add a full-text search palette. `DocsShell` now accepts a `search` loader that enables a ⌘K / Ctrl-K command palette:

```svelte
<DocsShell
  {config}
  content={docs}
  search={() => import('svelte-docsmith/search').then((m) => m.docs)}
>
```

The palette lazily fetches the generated `svelte-docsmith/search` index (a separate chunk, loaded only when search first opens), builds a FlexSearch index over each page's title, headings, description, and body, and links results to their pages with a context snippet. Header (⌘K button) and mobile (search icon) triggers share one dialog and one shortcut. Omit the prop to keep search off.

The framework-agnostic engine is also exported for custom search UIs: `createSearchEngine(docs)` returning `{ search(query, limit?) }`, plus the `SearchEngine` and `SearchResult` types.

Adds `flexsearch` as a runtime dependency.
