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

**1. Register the markdown pipeline** in `svelte.config.js`. Today you wire
mdsvex yourself (copy the config from the docs site); the one-call
`docsmith()` preprocess factory below is _planned_ for a later milestone:

```js
// svelte.config.js — planned one-call form
import { docsmith } from 'svelte-docsmith/preprocess';

export default {
	extensions: ['.svelte', '.md'],
	preprocess: [
		docsmith({
			/* shiki themes, extra rehype plugins */
		})
	]
};
```

**2. Add the shell** in `src/routes/docs/+layout.svelte`. `DocsShell` composes
the header, sidebar, content area, and table of contents. Nav is derived from
your content's frontmatter, never hand-written:

```svelte
<script lang="ts">
	import { DocsShell } from 'svelte-docsmith';
	import { docs } from '$content'; // your velite collection
	import type { DocsmithConfig } from 'svelte-docsmith';

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

That's it. Add `src/routes/docs/getting-started/+page.md` with frontmatter and
it appears in the sidebar, styled, highlighted, with breadcrumbs and a TOC.

## The CSS contract

Components are styled with Tailwind and shadcn design tokens. A consumer's
Tailwind build does not scan `node_modules` by default, so two lines are
required in your app's CSS (a scaffolding command to automate this is _planned_):

```css
@import 'tailwindcss';

/* 1. generate the utility classes the library's components use */
@source '../node_modules/svelte-docsmith/dist';

/* 2. provide the shadcn theme tokens (--background, --primary, ...) */
/* import svelte-docsmith/theme.css, or define the tokens yourself */
```

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

## What's exported

**Assembled experience** — the fast path:

- `DocsShell` — header + sidebar + content + TOC composition
- `DocPage` — the markdown page layout (breadcrumb + prose)
- `TableOfContents` — the in-page TOC list
- `Tabs`, `TabItem` — tabbed content blocks
- `DocsmithConfig` — the site-config type

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
