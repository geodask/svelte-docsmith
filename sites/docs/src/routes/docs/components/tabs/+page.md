---
title: Tabs
description: Group alternative content behind labeled tabs.
section: Components
order: 12
---

<script>
	import { Tabs, TabItem } from 'svelte-docsmith';
</script>

## Tabs

Group alternatives — package managers, framework variants, OS-specific commands —
so the reader sees one at a time. Pass the labels as `items`; each `TabItem`'s
`value` matches a label.

<Tabs items={['npm', 'pnpm', 'yarn']} value="npm">
<TabItem value="npm">

```bash
npm i -D svelte-docsmith
```

    </TabItem>
    <TabItem value="pnpm">

```bash
pnpm add -D svelte-docsmith
```

    </TabItem>
    <TabItem value="yarn">

```bash
yarn add -D svelte-docsmith
```

    </TabItem>

</Tabs>

## Usage

Leave blank lines around the content inside each `TabItem` so the markdown (code
fences, prose) is parsed.

<!-- prettier-ignore -->
````svelte
<script>
	import { Tabs, TabItem } from 'svelte-docsmith';
</script>

<Tabs items={['npm', 'pnpm']} value="npm">
	<TabItem value="npm">

```bash
npm i -D svelte-docsmith
```

	</TabItem>
	<TabItem value="pnpm">

```bash
pnpm add -D svelte-docsmith
```

	</TabItem>
</Tabs>
````

## Props

| Component | Prop    | Type       | Description                                  |
| --------- | ------- | ---------- | -------------------------------------------- |
| `Tabs`    | `items` | `string[]` | Tab labels, in order.                        |
| `Tabs`    | `value` | `string`   | Initially selected label. Defaults to first. |
| `TabItem` | `value` | `string`   | The label this panel belongs to.             |
