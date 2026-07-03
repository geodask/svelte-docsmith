---
title: Installation
description: Add Svelte DocSmith to a SvelteKit project.
section: Getting Started
order: 2
---

## Install the package

Svelte DocSmith is a SvelteKit library. Install it with your package manager of
choice:

```bash
pnpm add -D svelte-docsmith
```

It expects Svelte 5, SvelteKit 2, and Tailwind CSS v4 as peers — the same stack
this documentation site is built on.

## The CSS contract

Components are styled with Tailwind and shadcn design tokens. A consumer's
Tailwind build does not scan `node_modules` by default, so add two things to
your app's stylesheet:

```css
@import 'tailwindcss';

/* generate the utility classes the library's components use */
@source '../node_modules/svelte-docsmith/dist';
```

You also need the shadcn theme tokens (`--background`, `--primary`, `--radius`,
…) defined for `:root` and `.dark`. A published `svelte-docsmith/theme.css` and
a scaffolding command that writes all of this for you are planned.

## Next

With the package installed, continue to the [Quick Start](/docs/quick-start) to
wire up the pipeline and render your first page.
