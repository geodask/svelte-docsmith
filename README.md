# Svelte DocSmith

[![NPM version](https://img.shields.io/npm/v/svelte-docsmith.svg?style=flat)](https://www.npmjs.com/package/svelte-docsmith)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

The documentation framework for Svelte 5 library authors whose interactive
examples need to live inside one real, stateful SvelteKit app — not sandboxed as
isolated islands.

Write a markdown file under `src/routes/docs/` and you get a styled page with
syntax highlighting, heading anchors, a sidebar derived from your content, and a
live table of contents — no per-page wiring, no content collection to configure.

> **Status: pre-1.0.** Published to npm and usable today. The public API is still
> stabilising, so minor releases may include breaking changes until v1.0.

## Install

```bash
npm install svelte-docsmith
```

Peer dependencies: Svelte 5, SvelteKit 2, and Tailwind v4 — set up the standard
way in your app.

## Setup

Three small pieces, once.

**1. The markdown pipeline** — in `svelte.config.js`. One call bundles mdsvex,
Shiki highlighting (dual light/dark themes, a generous language set, plain-text
fallback for unknown languages), heading anchors, and the packaged page layout:

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

**2. The Vite plugin** — in `vite.config.ts`. It scans your doc pages'
frontmatter into the `svelte-docsmith/content` module (so the sidebar is derived
from content, never hand-written) and powers `LiveExample`:

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { docsmith } from 'svelte-docsmith/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [docsmith(), tailwindcss(), sveltekit()]
});
```

By default it scans `src/routes/docs`; pass `docsmith({ content: 'src/routes/guide' })`
to point elsewhere.

**3. The stylesheet** — in your root `app.css`. Your app needs Tailwind v4 set up
the standard way (`tailwindcss` + the `@tailwindcss/vite` plugin, stylesheet
imported in the root layout). After that the whole style contract is one import:

```css
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';
```

`theme.css` makes Tailwind scan the package, defines the shadcn theme tokens
(`--background`, `--primary`, `--radius`, …) for `:root` and `.dark`, and pulls
in the typography and animation plugins. Override any token by redefining it
after the import.

## The shell

Add `DocsShell` once, in `src/routes/docs/+layout.svelte`. It composes the
header, sidebar, content area, and table of contents. `docs` is the generated
content index — no import of a content collection, no alias to configure:

```svelte
<script lang="ts">
	import { DocsShell, defineConfig } from 'svelte-docsmith';
	import { docs } from 'svelte-docsmith/content';

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

## Doc pages

Each page is a `+page.md` under `src/routes/docs/`. Frontmatter drives the
sidebar; the body is markdown:

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

`title` names the page. `section` groups pages in the sidebar; `order` sorts
within a group (and orders the groups by their smallest `order`). Add the file
and it appears in the sidebar — styled, highlighted, with a table of contents.

## Live examples

`LiveExample` renders a real, interactive component next to its own
syntax-highlighted source — one file, imported twice, so the demo and its code
can never drift. The `?source` import is served by the same `docsmith()` Vite
plugin you already added:

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

| Entry point                  | What it is                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `svelte-docsmith`            | `DocsShell`, `LiveExample`, `Tabs`, `TabItem`, `defineConfig` + `DocsmithConfig`/`DocsContentItem` types |
| `svelte-docsmith/preprocess` | `docsmith()` — the mdsvex/Shiki pipeline (Node, config time)                                             |
| `svelte-docsmith/vite`       | `docsmith()` — content index + `?source` (Node, build time)                                              |
| `svelte-docsmith/content`    | `docs` — the generated sidebar content index                                                             |
| `svelte-docsmith/theme.css`  | the style contract                                                                                       |

The vendored shadcn primitives and internal helpers (the TOC engine, clipboard
utility, markdown renderer map) are **not** part of the public API — they can
change between releases. Get buttons, cards, etc. from `shadcn-svelte` directly.

## License

MIT — see [LICENSE](LICENSE).
