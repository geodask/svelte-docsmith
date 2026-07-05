---
title: Tabs
description: Group alternative content behind labeled tabs.
section: Components
order: 12
---

<script>
	import { Tabs, TabItem, PropsTable, Prop } from 'svelte-docsmith';
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

<PropsTable title="Tabs">
	<Prop name="items" type="string[]" required>
		Tab labels, in order.
	</Prop>
	<Prop name="value" type="string">
		Initially selected label. Defaults to first.
	</Prop>
</PropsTable>

<PropsTable title="TabItem">
	<Prop name="value" type="string" required>
		The label this panel belongs to.
	</Prop>
</PropsTable>
