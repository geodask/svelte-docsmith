---
title: Quick Start
description: Write your first documentation page.
section: Getting Started
order: 3
---

## Your first page

Create a markdown file under `src/routes/docs/` and it becomes a page. Add a
Svelte component and it just works:

```svelte
<script lang="ts">
	let count = $state(0);
</script>

<button onclick={() => count++}>
	clicked {count} times
</button>
```

## Highlighting a line

Use the notation-highlight transformer to draw attention to a line: [!code highlight]

```ts
const doc = loadDoc(slug); // [!code highlight]
return { doc };
```

## Styling

The theme is plain CSS custom properties, so you can override anything:

```css
:root {
	--primary: 13.21 73.04% 54.9%;
	--radius: 0.75rem;
}
```
