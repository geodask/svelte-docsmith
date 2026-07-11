---
title: Tabs
description: Group alternative content behind labeled tabs.
section: Components
order: 12
---

<script>
	import { Tabs, TabItem, PropsTable, Prop } from 'svelte-docsmith';
</script>

Group alternatives such as package managers, framework variants, or OS-specific
commands so the reader sees one at a time. Give each `TabItem` a `label`; `Tabs`
builds the tab row from them, so there is nothing to keep in sync.

<Tabs>
<TabItem label="npm">

```bash
npm i -D svelte-docsmith
```

    </TabItem>
    <TabItem label="pnpm">

```bash
pnpm add -D svelte-docsmith
```

    </TabItem>
    <TabItem label="yarn">

```bash
yarn add -D svelte-docsmith
```

    </TabItem>

</Tabs>

## Usage

Leave blank lines around the content inside each `TabItem` so the markdown (code
fences, prose) is parsed. The first tab is selected by default; pass `value` on
`Tabs` to start on a different one.

<!-- prettier-ignore -->
````svelte
<script>
	import { Tabs, TabItem } from 'svelte-docsmith';
</script>

<Tabs>
	<TabItem label="npm">

```bash
npm i -D svelte-docsmith
```

	</TabItem>
	<TabItem label="pnpm">

```bash
pnpm add -D svelte-docsmith
```

	</TabItem>
</Tabs>
````

## API reference

### Tabs

<PropsTable>
	<Prop name="value" type="string" default="first tab">
		Label of the tab selected by default.
	</Prop>
</PropsTable>

### TabItem

<PropsTable>
	<Prop name="label" type="string" required>
		The tab's trigger text.
	</Prop>
	<Prop name="value" type="string" default="label">
		Underlying value, only needed to disambiguate duplicate labels.
	</Prop>
</PropsTable>
