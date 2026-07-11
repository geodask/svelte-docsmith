---
title: Quick Start
description: Wire up the pipeline and render your first page.
section: Getting Started
order: 3
---

<script>
	import { Steps, Step, Callout, FileTree, FileTreeItem } from 'svelte-docsmith';
</script>

Four steps take you from an installed package to a live docs page in the
sidebar. Each one edits a single file.

<Steps>
<Step title="Register the markdown pipeline">

In `svelte.config.js`, add `.md` to your extensions and call `docsmith()`. It
bundles mdsvex, Shiki highlighting with a generous language set, heading
anchors, and the DocSmith page layout:

```js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { docsmith } from 'svelte-docsmith/preprocess';

export default {
	extensions: ['.svelte', '.md'],
	preprocess: [vitePreprocess(), docsmith()],
	kit: { adapter: adapter() }
};
```

</Step>
<Step title="Add the Vite plugin">

In `vite.config.ts`, add `docsmith()`. It scans your pages' frontmatter into the
`svelte-docsmith/content` module and powers live examples:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { docsmith } from 'svelte-docsmith/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [docsmith(), tailwindcss(), sveltekit()]
});
```

</Step>
<Step title="Add the shell">

In `src/routes/docs/+layout.svelte`, render `DocsShell`. It builds the sidebar
from the generated content index, so there is no nav array to maintain:

```svelte
<script lang="ts">
	import { docs } from 'svelte-docsmith/content';
	import { DocsShell, type DocsmithConfig } from 'svelte-docsmith';

	const config: DocsmithConfig = {
		title: 'My Library',
		github: 'https://github.com/you/my-library'
	};
	const { children } = $props();
</script>

<DocsShell {config} content={docs}>
	{@render children()}
</DocsShell>
```

</Step>
<Step title="Write a page">

Create `src/routes/docs/getting-started/+page.md`. The frontmatter drives the
sidebar; everything below it is your content:

````md
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

Those four files sit exactly here:

<FileTree>
	<FileTreeItem name="svelte.config.js" />
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
