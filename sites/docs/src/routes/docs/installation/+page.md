---
title: Installation
description: Add Svelte DocSmith to a SvelteKit project.
section: Getting Started
order: 2
---

<script>
	import { Tabs, TabItem, Callout } from 'svelte-docsmith';
</script>

## Install the package

Svelte DocSmith is a SvelteKit library. Install it with your package manager of
choice:

<Tabs>
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

```css
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';
```

`theme.css` makes Tailwind scan the package (so the utility classes its
components use are generated), defines the shadcn theme tokens (`--background`,
`--primary`, `--radius`, and the rest) for `:root` and `.dark`, and pulls in the
typography and animation plugins.

That single import is also the whole customization surface: redefine any token
after it to rebrand the entire system. See [Theming](/docs/theming) for the full
token list and how dark mode is wired.

## Next

With the package installed, continue to the [Quick Start](/docs/quick-start) to
wire up the pipeline and render your first page.
