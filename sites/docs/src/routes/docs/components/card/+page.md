---
title: Card & CardGrid
description: Linkable cards for next steps and feature grids.
section: Components
order: 11
---

<script>
	import { Card, CardGrid, PropsTable } from 'svelte-docsmith';
	import cardProps from '$docsmith/components/docs/card.svelte?props';
	import cardGridProps from '$docsmith/components/docs/card-grid.svelte?props';
</script>

A `Card` groups a title and description, optionally as a link. Give it an `href`
and it becomes clickable, with a hover state and a trailing arrow. `CardGrid`
lays cards out in a responsive grid that reflows without breakpoints: as many
columns as fit, down to one on narrow screens.

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

## API reference

### Card

<PropsTable of={cardProps} />

### CardGrid

<PropsTable of={cardGridProps} />
