---
title: Accordion
description: Collapse long-form content behind expandable headings.
section: Components
order: 13
---

<script>
	import { Accordion, AccordionItem, PropsTable, Prop } from 'svelte-docsmith';
</script>

Fold FAQs, optional details, or long asides behind a heading the reader expands
on demand, one panel at a time by default, so the page stays scannable.

<Accordion>
<AccordionItem title="What is svelte-docsmith?">

A documentation framework for Svelte 5. Your markdown files _are_ SvelteKit
routes, so examples run as part of one real app.

</AccordionItem>
<AccordionItem title="Do I have to configure the sidebar?">

No. Nav is derived from each page's frontmatter, never hand-written.

</AccordionItem>
<AccordionItem title="Can I open several panels at once?">

Yes. Pass `multiple` to the `Accordion` and every panel toggles independently.

</AccordionItem>
</Accordion>

## Usage

Each `AccordionItem` takes a `title` (the always-visible summary) and claims
its own value automatically, so you never wire up ids. Leave **blank lines**
around the panel content so mdsvex parses the markdown inside.

<!-- prettier-ignore -->
```svelte
<script>
	import { Accordion, AccordionItem } from 'svelte-docsmith';
</script>

<Accordion>
	<AccordionItem title="First question">

Answer with full **markdown**, including `code` and [links](/docs/theming).

	</AccordionItem>
	<AccordionItem title="Second question">

Another answer.

	</AccordionItem>
</Accordion>
```

Pass `multiple` to let panels stay open independently:

```svelte
<Accordion multiple>
	<!-- items -->
</Accordion>
```

## API reference

### Accordion

<PropsTable>
	<Prop name="multiple" type="boolean" default="false">
		Allow several panels open at once.
	</Prop>
</PropsTable>

### AccordionItem

<PropsTable>
	<Prop name="title" type="string" required>
		The heading that toggles the panel.
	</Prop>
</PropsTable>
