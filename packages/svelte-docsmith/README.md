# Svelte DocSmith

[![NPM version](https://img.shields.io/npm/v/svelte-docsmith.svg?style=flat)](https://www.npmjs.com/package/svelte-docsmith)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

The documentation framework for Svelte 5 library authors whose interactive
examples need to live inside one real, stateful SvelteKit app — not sandboxed as
isolated islands.

Drop a markdown file under `src/routes/docs/` and you get a styled page with
syntax highlighting, heading anchors, a sidebar navigation derived from your
content, and a live table of contents — no per-page wiring.

> **Status: early development.** The public API described here is stabilising
> milestone by milestone (see `PLAN.md` in the repo). Anything marked _planned_
> is designed but not yet shipped. Not yet published to npm.

## Two files and your markdown works

**1. Register the markdown pipeline** in `svelte.config.js`. One call bundles
mdsvex, Shiki highlighting (dual light/dark themes, a generous language set,
plain-text fallback for unknown languages), heading anchors, and the packaged
page layout:

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { docsmith } from 'svelte-docsmith/preprocess';

export default {
	extensions: ['.svelte', '.md'],
	preprocess: [vitePreprocess(), docsmith()],
	kit: { adapter: adapter() }
};
```

`docsmith()` accepts options for Shiki themes and extra languages, a custom
layout, and extra remark/rehype plugins — see `DocsmithPreprocessOptions`.

**2. Add the shell** in `src/routes/docs/+layout.svelte`. `DocsShell` composes
the header, sidebar, content area, and table of contents. Nav is derived from
your content's frontmatter, never hand-written:

```svelte
<script lang="ts">
	import { DocsShell, defineConfig } from 'svelte-docsmith';
	import { docs } from '$content'; // your velite collection

	const config = defineConfig({
		title: 'My Library',
		github: 'https://github.com/you/my-library'
	});
	const { children } = $props();
</script>

<DocsShell {config} content={docs}>
	{@render children()}
</DocsShell>
```

That's it. Add `src/routes/docs/getting-started/+page.md` with frontmatter and
it appears in the sidebar, styled, highlighted, with breadcrumbs and a TOC.

## The CSS contract

Components are styled with Tailwind (v4) and shadcn design tokens. The whole
contract is one import in your app's stylesheet:

```css
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';
```

`theme.css` makes Tailwind scan the package (generating the utility classes
the components use), defines the shadcn theme tokens (`--background`,
`--primary`, `--radius`, …) for `:root` and `.dark`, and pulls in the
typography and animation plugins. Override any token by redefining it after
the import.

## A doc page

````md
---
title: Getting Started
description: Install and configure the library.
section: Guides
order: 1
---

## Installation

```bash
npm install my-library
```
````

`title`/`description`/`section`/`order` drive the sidebar. `section` groups
pages; `order` sorts within a group.

## Live examples

`LiveExample` renders a real, interactive component next to its own
syntax-highlighted source — one file, imported twice, so the demo and its code
can never drift. Add the `exampleSource` Vite plugin:

```js
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { exampleSource } from 'svelte-docsmith/vite';

export default { plugins: [exampleSource(), sveltekit()] };
```

Then, in any doc page:

```svelte
<script>
	import { LiveExample } from 'svelte-docsmith';
	import Counter from '$lib/examples/counter.svelte';
	import counterSource from '$lib/examples/counter.svelte?source';
</script>

<LiveExample source={counterSource}>
	<Counter />
</LiveExample>
```

## What's exported

**Entry points:**

- `svelte-docsmith` — components and runtime utilities
- `svelte-docsmith/preprocess` — the `docsmith()` preprocessor factory (Node,
  config time)
- `svelte-docsmith/vite` — the `exampleSource()` Vite plugin (Node, build time)
- `svelte-docsmith/theme.css` — the CSS contract

**Assembled experience** — the fast path:

- `DocsShell` — header + sidebar + content + TOC composition
- `DocPage` — the markdown page layout (breadcrumb + prose)
- `TableOfContents` — the in-page TOC list
- `LiveExample` — rendered component + source panel
- `Tabs`, `TabItem` — tabbed content blocks
- `defineConfig`, `DocsmithConfig` — validated site config
- `navFromContent` — sidebar nav derived from a content collection

**Parts for customisers** — compose your own shell:

- `reactiveToc`, `tocFromContent` and the rest of the TOC engine
- `useClipboard` — copy-to-clipboard helper
- `reactiveBreadcrumb`, `setupReactiveBreadcrumb`
- `markdown` — the per-element renderer map (`pre`, `code`, `h2`, `h3`) for
  overriding individual markdown elements
- Types: `WithChildren`, `HighlightedTocItem`, `NavGroup`, `NavItem`

The vendored shadcn primitives are **internal** and intentionally not exported —
get buttons, cards, etc. from `shadcn-svelte` directly.

## License

MIT — see [LICENSE](LICENSE).
