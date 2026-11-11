---
title: Tooltip
description: A short note on a word or phrase, shown on hover, focus or tap.
section: Components
order: 22
---

<script>
	import { Tooltip, PropsTable } from 'svelte-docsmith';
	import tooltipProps from '$docsmith/components/docs/tooltip.svelte?props';
</script>

`Tooltip` puts a short note on a word or phrase in a sentence, for a term the
reader may not know.

Changes show up at once thanks to <Tooltip note="Hot module replacement: Vite swaps the changed module into the running page without a reload.">HMR</Tooltip>, and the build stays <Tooltip note="Nothing runs in the browser that the page doesn't need.">lean</Tooltip>.

The words keep the sentence's own font and colour, with a dotted underline
that says there's more to them. The note opens when the pointer rests on the
words or the keyboard focuses them, and a tap opens it on a touch screen.
A click keeps it open, and Escape or a click anywhere else closes it.

## Usage

```svelte
<script>
	import { Tooltip } from 'svelte-docsmith';
</script>

Changes show up at once thanks to <Tooltip note="Hot module replacement">HMR</Tooltip>.
```

Keep the `Tooltip` on the same line as the words around it. A tag that starts
a line begins a new block in markdown, and would end the paragraph there.

Keep the note to a sentence or two. A reader has to stop on the word to read
it, so anything longer, or anything the reader needs to follow the page,
belongs in the text itself or in a [Callout](/docs/components/callout).

For a note with formatting, pass a snippet:

```svelte
<Tooltip>
	{#snippet note()}Runs <code>vite build</code> and then checks every link.{/snippet}
	the build
</Tooltip>
```

## API reference

<PropsTable of={tooltipProps} />
