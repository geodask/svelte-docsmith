---
title: Search
description: A built-in ⌘K full-text search palette, generated from your pages.
section: Core Concepts
order: 9
---

<script>
	import { Callout } from 'svelte-docsmith';
</script>

DocSmith builds a full-text search index from your pages at build time and ships
a ⌘K / Ctrl-K command palette that searches it. There is nothing to host and no
service to configure.

## Enable it

Pass a `search` loader to `DocsShell`. It hands back the generated index, which
DocSmith lazily fetches the first time the palette opens, so it never weighs down
your initial load:

```svelte title="src/routes/docs/+layout.svelte"
<script lang="ts">
	import { docs } from 'svelte-docsmith/content';
	import { DocsShell } from 'svelte-docsmith';
	import { siteConfig } from '$lib/site-config';

	const { children } = $props();
</script>

<DocsShell
	config={siteConfig}
	content={docs}
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
>
	{@render children()}
</DocsShell>
```

That is the whole setup. A search button appears in the header, ⌘K (Ctrl-K on
Windows and Linux) opens the palette from anywhere, and results link straight to
the matching page. Omit the prop to leave search off.

<Callout variant="note" title="Why a loader, not the data">

Passing a function that dynamically imports `svelte-docsmith/search` lets your
bundler split the index into its own chunk. The index is fetched only when a
reader first opens search, not on every page view.

</Callout>

## What gets indexed

Each page contributes its `title`, its `h2`/`h3` headings, its frontmatter
`description`, and its body text, reduced to plain prose, with code blocks,
component markup, and markdown punctuation stripped out. Title and heading
matches rank above body matches.

## A custom search UI

The palette is the default, but the engine is exported if you want to build your
own input. `createSearchEngine` takes the generated index and returns a
`search(query, limit?)` that yields ranked results with a context snippet:

```ts
import { createSearchEngine } from 'svelte-docsmith';
import { docs } from 'svelte-docsmith/search';

const engine = createSearchEngine(docs);

for (const hit of engine.search('theming')) {
	console.log(hit.title, hit.path, hit.snippet);
}
```
