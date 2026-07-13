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

## Synced tabs

Give related `Tabs` the same `syncKey` and they share one selection: pick `pnpm`
in any block and every block with that key switches to `pnpm`, across the page
and the rest of the site. The choice is remembered across reloads. Use it for
package managers, runtimes, or any choice a reader makes once and keeps.

Try it. These two blocks share `syncKey="demo-pm"`; changing one moves the other:

<Tabs syncKey="demo-pm">
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

<Tabs syncKey="demo-pm">
<TabItem label="npm">

```bash
npx sv add svelte-docsmith
```

</TabItem>
<TabItem label="pnpm">

```bash
pnpm dlx sv add svelte-docsmith
```

</TabItem>
<TabItem label="yarn">

```bash
yarn dlx sv add svelte-docsmith
```

</TabItem>
</Tabs>

## API reference

### Tabs

<PropsTable>
	<Prop name="value" type="string" default="first tab">
		Label of the tab selected by default.
	</Prop>
	<Prop name="syncKey" type="string">
		Sync group. Blocks with the same key share their selection and remember it
		across reloads.
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
