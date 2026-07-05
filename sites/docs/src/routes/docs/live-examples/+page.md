---
title: Live Examples
description: Real interactive components rendered inside the docs.
section: Core Concepts
order: 6
---

<script>
	import { LiveExample, Callout } from 'svelte-docsmith';
	import Counter from '$lib/examples/counter.svelte';
	import counterSource from '$lib/examples/counter.svelte?source';
</script>

## A real, running component

The button below is a real Svelte component running as part of this app. It is
not a screenshot, and not a sandboxed iframe. Click it, then open the source:

<LiveExample source={counterSource}>
	<Counter />
</LiveExample>

## Single source of truth

The rendered component and the source panel above both come from **one file**,
`counter.svelte`. It is imported twice: once as a component (rendered) and once
as `?source` (highlighted at build time by the `docsmith()` plugin from
`svelte-docsmith/vite`), so the demo and its code can never drift.

<Callout type="tip" title="Examples that can't rot">

The example in your docs is the same component your users import. When the
component changes, the rendered demo and its shown source both change with it,
so it can never decay into a screenshot of something that used to work.

</Callout>

See [Writing pages](/docs/writing-pages) for the import pattern to copy.
