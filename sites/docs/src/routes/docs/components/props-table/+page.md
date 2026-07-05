---
title: Props Table
description: Document a component's API in a consistent table.
section: Components
order: 17
---

<script>
	import { PropsTable, Prop } from 'svelte-docsmith';
</script>

## Props Table

Document a component's props the same way on every page — name, type, and
description in one styled table, so the API reference reads consistently instead
of drifting per author.

<PropsTable>
	<Prop name="variant" type="'default' | 'primary'" default="'default'">
		Visual intent of the component.
	</Prop>
	<Prop name="href" type="string" required>
		Turns the element into a link.
	</Prop>
	<Prop name="disabled" type="boolean" default="false">
		Prevents interaction.
	</Prop>
</PropsTable>

## Usage

Wrap `Prop` rows in a `PropsTable`. Give each `Prop` a `name`; add `type`,
`default`, or `required` as needed, and put the description in the body.

<!-- prettier-ignore -->
```svelte
<script>
	import { PropsTable, Prop } from 'svelte-docsmith';
</script>

<PropsTable>
	<Prop name="variant" type="'default' | 'primary'" default="'default'">
		Visual intent of the component.
	</Prop>
	<Prop name="href" type="string" required>
		Turns the element into a link.
	</Prop>
</PropsTable>
```

## Props

<PropsTable title="PropsTable">
	<Prop name="title" type="string">
		Optional caption — e.g. the component name when a page documents several.
	</Prop>
</PropsTable>

<PropsTable title="Prop">
	<Prop name="name" type="string" required>
		Property name.
	</Prop>
	<Prop name="type" type="string">
		Type signature, shown as code.
	</Prop>
	<Prop name="default" type="string">
		Default value, shown beside the type.
	</Prop>
	<Prop name="required" type="boolean" default="false">
		Marks the property as required.
	</Prop>
</PropsTable>
