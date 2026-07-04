---
title: Live Examples
description: Real interactive components rendered inside the docs.
section: Core Concepts
order: 5
---

<script>
	import { LiveExample } from 'svelte-docsmith';
	import Counter from '$lib/examples/counter.svelte';
	import counterSource from '$lib/examples/counter.svelte?source';
</script>

## A real, running component

The button below is a real Svelte component running as part of this app — not a
screenshot, not a sandboxed iframe. Click it, then open the source:

<LiveExample source={counterSource}>
	<Counter />
</LiveExample>

## Single source of truth

The rendered component and the source panel above both come from **one file**,
`counter.svelte`. It is imported twice — once as a component (rendered) and once
as `?source` (highlighted at build time by the `exampleSource` plugin from
`svelte-docsmith/vite`) — so the demo and its code can never drift.

A remark convention (` ```svelte example `) to remove even the import lines is a
planned refinement.
