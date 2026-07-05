---
title: Card & CardGrid
description: Linkable cards for next steps and feature grids.
section: Components
order: 11
---

<script>
	import { Card, CardGrid } from 'svelte-docsmith';
</script>

## Card

A card groups a title and description, optionally as a link. Give it an `href`
and it becomes clickable, with a hover state and a trailing arrow.

<CardGrid>
	<Card title="Introduction" href="/docs/introduction">
		What Svelte DocSmith is and who it's for.
	</Card>
	<Card title="Quick Start" href="/docs/quick-start">
		Wire up the pipeline and render your first page.
	</Card>
	<Card title="Theming" href="/docs/theming">
		Override tokens or pick a pre-installed theme.
	</Card>
</CardGrid>

## CardGrid

`CardGrid` lays cards out in a responsive grid that reflows without breakpoints —
as many columns as fit, down to one on narrow screens.

## Usage

```svelte
<script>
	import { Card, CardGrid } from 'svelte-docsmith';
</script>

<CardGrid>
	<Card title="Quick Start" href="/docs/quick-start">
		Wire up the pipeline and render your first page.
	</Card>
	<Card title="External link" href="https://svelte.dev" external>Opens in a new tab.</Card>
</CardGrid>
```

## Props

| Component  | Prop       | Type      | Description                 |
| ---------- | ---------- | --------- | --------------------------- |
| `Card`     | `title`    | `string`  | Card heading (required).    |
| `Card`     | `href`     | `string`  | Makes the card a link.      |
| `Card`     | `external` | `boolean` | Open the link in a new tab. |
| `Card`     | `icon`     | `Snippet` | Optional leading icon.      |
| `CardGrid` | `children` | `Snippet` | The `Card`s to lay out.     |
