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

Components are styled with Tailwind and shadcn design tokens. The whole
contract is one import in your app's stylesheet:

```css
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';
```

`theme.css` makes Tailwind scan the package (so the utility classes its
components use are generated), defines the shadcn theme tokens
(`--background`, `--primary`, `--radius`, …) for `:root` and `.dark`, and pulls
in the typography and animation plugins.

That single import is also the whole customization surface — redefine any token
after it to rebrand the entire system. See [Theming](/docs/theming) for the full
token list and how dark mode is wired.

## Next

With the package installed, continue to the [Quick Start](/docs/quick-start) to
wire up the pipeline and render your first page.
