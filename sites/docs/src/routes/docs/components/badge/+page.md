---
title: Badge
description: Small status and label pills with semantic intents.
section: Components
order: 14
---

<script>
	import { Badge, PropsTable, Prop } from 'svelte-docsmith';
</script>

## Badge

Label a status, version, or category inline. Six intents cover the usual docs
needs — neutral through danger — each driven by your theme tokens so they recolor
with the rest of the site.

<p class="not-prose flex flex-wrap gap-2">
	<Badge>default</Badge>
	<Badge variant="primary">primary</Badge>
	<Badge variant="secondary">secondary</Badge>
	<Badge variant="success">success</Badge>
	<Badge variant="warning">warning</Badge>
	<Badge variant="danger">danger</Badge>
	<Badge variant="outline">outline</Badge>
</p>

## Usage

Import it and pick a `variant`. The default is `default`; pass `href` to turn the
badge into a link.

```svelte
<script>
	import { Badge } from 'svelte-docsmith';
</script>

<Badge variant="success">Stable</Badge>
<Badge variant="warning">Beta</Badge>
<Badge variant="primary" href="/docs/introduction">New</Badge>
```

## Props

<PropsTable>
	<Prop name="variant" type="'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'" default="'default'">
		Visual intent.
	</Prop>
	<Prop name="href" type="string">
		Renders the badge as a link.
	</Prop>
</PropsTable>
