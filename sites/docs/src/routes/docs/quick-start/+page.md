---
title: Quick Start
description: Wire up the pipeline and render your first page.
section: Getting Started
order: 3
---

## Register the markdown pipeline

In `svelte.config.js`, add `.md` to your extensions and run your markdown
through mdsvex with the DocSmith layout and Shiki highlighting. (A one-call
`docsmith()` preprocess factory that bundles this is planned.)

```js
import { mdsvex } from 'mdsvex';

export default {
	extensions: ['.svelte', '.md'],
	preprocess: [
		mdsvex({
			extensions: ['.md'],
			layout: './src/lib/doc-layout.svelte'
			// + rehype-slug, sectionize, and @shikijs/rehype
		})
	]
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
