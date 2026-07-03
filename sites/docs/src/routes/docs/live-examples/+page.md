---
title: Live Examples
description: Real interactive components rendered inside the docs.
section: Core Concepts
order: 2
---

<script>
	import Counter from '$lib/examples/counter.svelte';
</script>

## A real, running component

The button below is a real Svelte component running as part of this app — not a
screenshot, not a sandboxed iframe. Click it:

<div class="not-prose my-6 flex justify-center rounded-lg border border-border bg-muted/30 p-8">
	<Counter />
</div>

And here is its source:

```svelte
<script lang="ts">
	let count = $state(0);
</script>

<button onclick={() => count++}>
	clicked {count}
	{count === 1 ? 'time' : 'times'}
</button>
```

This is the manual form of the feature. The build-time plugin (next) will pair
the rendered component and its source from a single file, so they can never
drift.
