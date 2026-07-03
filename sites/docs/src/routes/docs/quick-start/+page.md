---
title: Quick Start
description: Wire up the pipeline and render your first page.
section: Getting Started
order: 3
---

## Register the markdown pipeline

In `svelte.config.js`, add `.md` to your extensions and call `docsmith()` —
it bundles mdsvex, Shiki highlighting with a generous language set, heading
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

## Add the shell

In `src/routes/docs/+layout.svelte`, render `DocsShell`. It builds the sidebar
from your content collection, so there is no nav array to maintain:

```svelte
<script lang="ts">
	import { docs } from '$content';
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

## Write a page

Create `src/routes/docs/getting-started/+page.md` with frontmatter and content:

```svelte
<script lang="ts">
	let count = $state(0);
</script>

<button onclick={() => count++}>
	clicked {count} times
</button>
```

The line below is emphasised with the notation-highlight transformer:

```ts
const doc = loadDoc(slug); // [!code highlight]
return { doc };
```

That's the whole loop: drop a markdown file under `src/routes/docs/`, and it
appears in the sidebar — styled, highlighted, with breadcrumbs and a table of
contents.
