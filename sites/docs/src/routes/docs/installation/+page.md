---
title: Installation
description: Add Svelte DocSmith to a SvelteKit project.
section: Getting Started
order: 2
---

<script>
	import { Tabs, TabItem, Callout } from 'svelte-docsmith';
</script>

## Start a new project

The fastest way to begin is the scaffolder. It creates a ready-to-run SvelteKit
project already wired with DocSmith: the markdown pipeline, the Vite plugin, the
style contract, a `DocsShell` layout, a 404 page, and a couple of sample pages.

<Tabs syncKey="pkg">
<TabItem label="pnpm">

```bash
pnpm create svelte-docsmith my-docs
```

</TabItem>
<TabItem label="npm">

```bash
npm create svelte-docsmith@latest my-docs
```

</TabItem>
<TabItem label="yarn">

```bash
yarn create svelte-docsmith my-docs
```

</TabItem>
<TabItem label="bun">

```bash
bun create svelte-docsmith my-docs
```

</TabItem>
</Tabs>

Then install dependencies and start the dev server:

```bash
cd my-docs
npm install
npm run dev
```

That is the whole setup. Skip ahead to [Writing pages](/docs/writing-pages) to
start authoring. The rest of this page covers adding DocSmith to a project you
already have.

## Add to an existing project

Svelte DocSmith is a SvelteKit library. Install it with your package manager of
choice:

<Tabs syncKey="pkg">
<TabItem label="pnpm">

```bash
pnpm add -D svelte-docsmith
```

</TabItem>
<TabItem label="npm">

```bash
npm install -D svelte-docsmith
```

</TabItem>
<TabItem label="yarn">

```bash
yarn add -D svelte-docsmith
```

</TabItem>
<TabItem label="bun">

```bash
bun add -D svelte-docsmith
```

</TabItem>
</Tabs>

<Callout variant="note" title="Prerequisites">

DocSmith expects **Svelte 5**, **SvelteKit 2**, and **Tailwind CSS v4** as peer
dependencies, the same stack this documentation site runs on. A fresh
`npx sv create` app with Tailwind selected already has them.

</Callout>

## The CSS contract

Components are styled with Tailwind and shadcn design tokens. The whole contract
is one import in your app's stylesheet:

```css title="src/app.css"
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';
```

`theme.css` makes Tailwind scan the package (so the utility classes its
components use are generated), registers the shadcn design tokens
(`--background`, `--primary`, `--radius`, and the rest), and pulls in the
typography and animation plugins.

The tokens' values come from your theme: Darkmatter unless `docsmith()` names
another with `theme`. Redefine any token in `app.css` and it wins over the
theme. See [Theming](/docs/theming) for the presets, theme files and the full
token list.

## Next

With the package installed, continue to the [Quick Start](/docs/quick-start) to
wire up the pipeline and render your first page.
