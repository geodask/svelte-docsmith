---
title: Quick start
description: Install Acme UI, add your first component, and theme it in five minutes.
---

<script>
	import { Callout, Tabs, TabItem, Steps, Step, Badge, Kbd } from 'svelte-docsmith';
</script>

Acme UI is a set of accessible components for Svelte. Every surface reads the
theme's tokens, so the whole library follows your brand. <Badge variant="primary">New</Badge> <Badge variant="warning">Beta</Badge>

## Install

<Tabs>
<TabItem label="pnpm">

```sh
pnpm add acme-ui
```

</TabItem>
<TabItem label="npm">

```sh
npm install acme-ui
```

</TabItem>
</Tabs>

## Configure

Register the plugin in your [Vite config](#configure). Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search the docs at any time.

```ts title="vite.config.ts"
import { defineConfig } from 'vite';
import { acme } from 'acme-ui/vite';

// Options are checked when Vite starts.
export default defineConfig({
	plugins: [acme({ theme: './src/theme.css', strict: true, port: 5173 })]
});
```

<Callout variant="note" title="Good to know">

The theme file is plain CSS, so your editor's colour picker works on it.

</Callout>

## Your first component

<Steps>
<Step title="Import it">

```svelte title="src/routes/+page.svelte"
<script lang="ts">
	import { Button } from 'acme-ui';
	let count = $state(0);
</script>

<Button onclick={() => count++}>Clicked {count} times</Button>
```

</Step>
<Step title="Run the dev server">

Start `pnpm dev` and open the page.

</Step>
</Steps>

<Callout variant="warning" title="Breaking change">

`theme` replaced `themes` in 2.0. The old option still works with a warning.

</Callout>

## Options

| Option   | Type      | Default     | Description                         |
| -------- | --------- | ----------- | ----------------------------------- |
| `theme`  | `string`  | `'default'` | A preset name or a theme file path. |
| `strict` | `boolean` | `false`     | Fail the build on a missing token.  |
| `port`   | `number`  | `5173`      | The dev server port.                |

<Callout variant="danger" title="Don't">

Edit the generated files by hand; they're rewritten on every build.

</Callout>
