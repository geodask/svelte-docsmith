---
title: Compare
description: Two versions of one thing, one over the other, with a divider the reader drags.
section: Components
order: 27
since: '0.28'
---

<script>
	import { Compare, Callout, Badge, PropsTable } from 'svelte-docsmith';
	import compareProps from '$docsmith/components/docs/compare.svelte?props';
	import homeLight from '../image/home-light.png';
	import homeDark from '../image/home-dark.png';
</script>

`Compare` puts two versions of one thing on top of each other, with a divider
between them. Drag the divider, or focus it and use the arrow keys, to see
more of one side or the other.

<Compare
	before={homeLight}
	after={homeDark}
	beforeLabel="Light"
	afterLabel="Dark"
	beforeAlt="The Svelte DocSmith home page in light mode"
	afterAlt="The Svelte DocSmith home page in dark mode"
/>

## Pictures

Give each side a picture, the same way [`Image`](/docs/components/image) takes
one: import the file from next to the page, or give a URL. An imported file
that doesn't exist fails the build, so a broken comparison never ships. Both
pictures should be the same size, so their details line up.

```svelte
<script>
	import { Compare } from 'svelte-docsmith';
	import light from './home-light.png';
	import dark from './home-dark.png';
</script>

<Compare
	before={light}
	after={dark}
	beforeLabel="Light"
	afterLabel="Dark"
	beforeAlt="The home page in light mode"
	afterAlt="The home page in dark mode"
/>
```

Each picture needs its own alt text, saying what it shows. With two pictures,
the reader can drag anywhere on them.

## Live content

A side can be a snippet instead, holding anything you can render: a component
before and after a change, say. With live content, only the divider drags, so
the reader can still click what's inside. The labels sit in the top corners,
so leave some room above the content.

<Compare>
	{#snippet before()}
		<div class="px-6 pt-12 pb-6">
			<p class="text-sm">Added in 0.4. Shows a message that leaves on its own.</p>
		</div>
	{/snippet}
	{#snippet after()}
		<div class="px-6 pt-12 pb-6">
			<p class="text-sm"><Badge>Since 0.4</Badge> Shows a message that leaves on its own.</p>
		</div>
	{/snippet}
</Compare>

```svelte
<Compare>
	{#snippet before()}
		<p>Added in 0.4. Shows a message that leaves on its own.</p>
	{/snippet}
	{#snippet after()}
		<p><Badge>Since 0.4</Badge> Shows a message that leaves on its own.</p>
	{/snippet}
</Compare>
```

## Labels and the divider

The labels say "Before" and "After" unless `beforeLabel` and `afterLabel` say
otherwise. They also name the divider for screen readers, which hear it as a
slider with how much of the first side shows. `position` sets where the
divider starts, as a percentage from the left.

| Key                | Moves the divider     |
| ------------------ | --------------------- |
| Left / Right arrow | 2% that way           |
| Shift + an arrow   | 10% that way          |
| Home / End         | All the way to an end |

## For agents

Agents read the page as written, so they see both sides of the tag with their
labels.

## Props

<PropsTable of={compareProps} />
