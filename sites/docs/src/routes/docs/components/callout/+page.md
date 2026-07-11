---
title: Callout
description: Draw attention to a note, tip, warning, or danger.
section: Components
order: 9
---

<script>
	import { Callout, PropsTable, Prop } from 'svelte-docsmith';
</script>

Highlight something the reader shouldn't miss. Four intents, each with its own
icon and color. The body stays on the page's normal text color so it's always
legible.

<Callout variant="note">

This is a **note**, neutral informational context.

</Callout>

<Callout variant="tip">

This is a **tip**, a helpful shortcut or best practice.

</Callout>

<Callout variant="warning">

This is a **warning**, so proceed carefully.

</Callout>

<Callout variant="danger">

This is a **danger** callout: something here can break or lose data.

</Callout>

## Usage

Import it and pick a `variant`. The default is `note`; pass `title` to override
the heading. Leave **blank lines** around the content so mdsvex parses the
markdown inside (bold, links, code). Without them it renders as literal text.

<!-- prettier-ignore -->
```svelte
<script>
	import { Callout } from 'svelte-docsmith';
</script>

<Callout variant="tip" title="One more thing">

You can override the heading with the `title` prop, and use **markdown**
inside, including `code` and [links](/docs/theming).

</Callout>
```

## API reference

<PropsTable>
	<Prop name="variant" type="'note' | 'tip' | 'warning' | 'danger'" default="'note'">
		Visual intent.
	</Prop>
	<Prop name="title" type="string" default="the variant">
		Heading above the body.
	</Prop>
</PropsTable>
