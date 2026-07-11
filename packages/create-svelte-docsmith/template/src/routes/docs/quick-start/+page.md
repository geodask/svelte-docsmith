---
title: Quick Start
description: Write your first pages.
section: Getting Started
order: 2
---

Add a markdown file anywhere under `src/routes/docs/` and it shows up in the
sidebar, styled and highlighted.

## Code blocks

Fenced code is highlighted by Shiki. Emphasize a line with a comment marker:

```ts
const docs = loadDocs();
const active = docs.find((d) => d.current); // [!code highlight]
```

## Components

DocSmith ships components you can use right inside markdown: callouts, tabs,
cards, steps, and more. Import them in a `<script>` block at the top of the page,
then use them in the body.

Learn more in the [Svelte DocSmith documentation](https://docsmith.geodask.com).
