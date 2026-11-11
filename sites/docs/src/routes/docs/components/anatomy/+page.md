---
title: Anatomy
description: Label the parts of a live component with numbers and describe each one below it.
section: Components
order: 26
since: '0.28'
---

<script>
	import { Anatomy, Part, PropsTable } from 'svelte-docsmith';
	import Disclosure from '#lib/examples/disclosure.svelte';
	import anatomyProps from '$docsmith/components/docs/anatomy.svelte?props';
	import partProps from '$docsmith/components/docs/part.svelte?props';
</script>

`Anatomy` shows a component with its named parts labelled over it, and a list
below that says what each part is. The component is the real one, not a
picture: it still works, and the labels move with it. Press the heading below
to open it.

<Anatomy>
	<Disclosure title="What is a disclosure?">
		A heading that shows and hides the details under it.
	</Disclosure>
	{#snippet parts()}
<Part name="root">The box around everything. It holds the open state.</Part>
<Part name="trigger">

The button the reader presses. It says whether the details are open with `aria-expanded`.

</Part>
<Part name="title">

The heading text, from the `title` prop.

</Part>
<Part name="indicator">The chevron. It turns over when the details open.</Part>
<Part name="content">

The details. They are only in the page while open, so this part is labelled only then.

</Part>
	{/snippet}
</Anatomy>

## Usage

Mark each part of the component with a `data-part` attribute. Then put the
component in `Anatomy`, and describe each part with a `Part` in the `parts`
snippet. Each `Part` matches the element whose `data-part` has the same name.

```svelte
<script>
	import { Anatomy, Part } from 'svelte-docsmith';
	import Disclosure from '#lib/disclosure.svelte';
</script>

<Anatomy>
	<Disclosure title="What is a disclosure?">The details.</Disclosure>
	{#snippet parts()}
		<Part name="trigger">The button the reader presses.</Part>
		<Part name="content">The details, shown while open.</Part>
	{/snippet}
</Anatomy>
```

```svelte
<!-- disclosure.svelte -->
<div data-part="root">
	<button data-part="trigger" onclick={() => (open = !open)}>{title}</button>
	{#if open}
		<div data-part="content">{@render children()}</div>
	{/if}
</div>
```

Parts are numbered in the order the `Part`s are written, so write them in the
order you want them read. A `Part` can hold markdown, code and links: leave a
blank line after its opening tag and before its closing one, as you would in a
[Callout](/docs/components/callout).

## Labels follow the component

The labels are drawn on top of the real component, so a reader can use it. A
click on a label goes through to the component under it. When the component
changes size or state, the labels move with it, and a part that leaves the
page loses its label until it comes back.

Pointing at a part in the list, or tabbing into it, outlines that part on the
component. The **Hide labels** button below the component takes the labels
away so the reader can try it without them.

## Parts it can't label

A part has to be inside `Anatomy` to be labelled. A popover, menu or tooltip
that renders into `<body>` (a portal) is outside it, so it gets no label. You
can still describe it with a `Part`; its number shows in the list only.

In development, the console warns about a `data-part` that has no `Part`, and
about a `Part` that matches no `data-part`. A `data-part` with no `Part` is
still labelled. It is numbered after the `Part`s.

## For agents

Agents read the page as written, so they see the component's tag and each
`Part` with its description, in order.

## Props

<PropsTable of={anatomyProps} />

<PropsTable of={partProps} />
