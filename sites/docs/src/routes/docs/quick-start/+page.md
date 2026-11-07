---
title: Quick Start
description: Wire up the pipeline and render your first page.
section: Getting Started
order: 3
---

<script>
	import { Steps, Step, Callout, FileTree, FileTreeItem } from 'svelte-docsmith';
</script>

Three steps take you from an installed package to a live docs page in the
sidebar. Each one edits a single file.

<Callout variant="tip" title="Scaffolding a new project?">

`npm create svelte-docsmith` does every step on this page for you. This walk
through is for adding DocSmith to an existing app, or for understanding the
pieces. See [Installation](/docs/installation) for the scaffolder.

</Callout>

<Steps>
<Step title="Configure Vite">

DocSmith is one Vite plugin, `docsmith()` from `svelte-docsmith/vite`, and it is
the only place your docs are configured. It compiles your `.md` pages (mdsvex,
Shiki highlighting with a generous language set, heading anchors, and the
DocSmith page layout), scans their frontmatter into the sidebar, and powers live
examples. Give it your site's title, put it before `sveltekit()`, and add `.md`
to SvelteKit's extensions so markdown pages become routes:

<!-- prettier-ignore -->
```ts title="vite.config.ts"
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { docsmith } from 'svelte-docsmith/vite'; // [!code ++]
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		docsmith({ // [!code ++]
			site: { title: 'My Library', github: 'https://github.com/you/my-library' } // [!code ++]
		}), // [!code ++]
		tailwindcss(),
		sveltekit({
			extensions: ['.svelte', '.md'], // [!code ++]
			preprocess: [vitePreprocess()],
			adapter: adapter()
		})
	]
});
```

Every other option, from code block themes to versioning, goes in the same call.
See [Configuration](/docs/configuration).

<Callout variant="note" title="On SvelteKit 2?">

DocSmith supports SvelteKit 2 and 3. On SvelteKit 2, `extensions` goes in
`svelte.config.js` instead, and you import your own files from `$lib` rather
than `#lib`. `docsmith()` stays in `vite.config.ts`.

</Callout>

</Step>
<Step title="Add the shell">

In `src/routes/docs/+layout.svelte`, render `DocsShell`. It builds the sidebar
from the generated content index, so there is no nav array to maintain, and it
reads your `site` options itself:

```svelte title="src/routes/docs/+layout.svelte"
<script lang="ts">
	import { content } from 'svelte-docsmith/content';
	import { DocsShell } from 'svelte-docsmith';

	const { children } = $props();
</script>

<DocsShell {content}>
	{@render children()}
</DocsShell>
```

</Step>
<Step title="Write a page">

Create `src/routes/docs/getting-started/+page.md`. The frontmatter drives the
sidebar; everything below it is your content:

````md title="src/routes/docs/getting-started/+page.md"
---
title: Getting Started
description: Your first steps.
section: Guides
order: 1
---

## Hello

This is a real SvelteKit route. Code blocks are highlighted by Shiki, and you
can emphasise a line with the notation transformer:

```ts
const docs = loadDocs(); // [!code highlight]
```
````

</Step>
</Steps>

## What you end up with

Those files sit exactly here:

<FileTree>
	<FileTreeItem name="vite.config.ts" />
	<FileTreeItem name="src" folder>
		<FileTreeItem name="app.css" />
		<FileTreeItem name="routes" folder>
			<FileTreeItem name="docs" folder>
				<FileTreeItem name="+layout.svelte" />
				<FileTreeItem name="getting-started/+page.md" highlight />
			</FileTreeItem>
		</FileTreeItem>
	</FileTreeItem>
</FileTree>

<Callout variant="tip" title="That's the whole loop">

Drop a markdown file under `src/routes/docs/` and it appears in the sidebar,
styled, highlighted, with breadcrumbs and a table of contents. To embed a
running component, see [Writing pages](/docs/writing-pages), which covers
frontmatter, live examples, and code highlighting in full.

</Callout>
