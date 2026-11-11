---
title: Columns
description: Set content side by side in two or three columns that stack on phones.
section: Components
order: 19
---

<script>
	import { Columns, PropsTable } from 'svelte-docsmith';
	import columnsProps from '$docsmith/components/docs/columns.svelte?props';
</script>

`Columns` sets content side by side: two columns, or three, each the same
width. Below Tailwind's `sm` breakpoint (yours, if you change it) they stack into one, so a phone reads them in
order. For a grid of links, use [CardGrid](/docs/components/card) instead.

<Columns>
<div>

**Before**

The reader opens three pages to learn which flags the command takes, then
guesses at the order.

</div>
<div>

**After**

One page lists every flag in the order the command reads them, with a working
example under each.

</div>
</Columns>

## Usage

Each child of `Columns` is one column. Wrap markdown in a `<div>`, with
**blank lines** inside it so mdsvex reads the markdown, to keep several
paragraphs in one column. Keep headings outside `Columns`: a heading belongs
to the page's outline, and a column holds part of one section.

<!-- prettier-ignore -->
```svelte
<script>
	import { Columns } from 'svelte-docsmith';
</script>

<Columns>
<div>

**Before**

The reader opens three pages to learn which flags the command takes.

</div>
<div>

**After**

One page lists every flag, with a working example under each.

</div>
</Columns>
```

Pass `cols={3}` for three columns:

<Columns cols={3}>
<div>

**Write** the page in markdown.

</div>
<div>

**Preview** it with live examples.

</div>
<div>

**Ship** it as part of the app.

</div>
</Columns>

A component works as a column on its own, with no `<div>` around it. The
[Do and Don't](/docs/components/do-dont) panels are made to sit in two columns.

## API reference

<PropsTable of={columnsProps} />
