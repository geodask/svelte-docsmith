---
title: Live Examples
description: Real interactive components rendered inside the docs.
section: Core Concepts
order: 7
---

<script>
	import { LiveExample, Callout, PropsTable, Badge } from 'svelte-docsmith';
	import Counter from '#lib/examples/counter.svelte';
	import counterSource from '#lib/examples/counter.svelte?source';
	import liveExampleProps from '$docsmith/components/docs/live-example.svelte?props';
	import badgeProps from '$docsmith/components/docs/badge.svelte?props';
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

<Callout variant="tip" title="Examples that can't rot">

The example in your docs is the same component your users import. When the
component changes, the rendered demo and its shown source both change with it,
so it can never decay into a screenshot of something that used to work.

</Callout>

See [Writing pages](/docs/writing-pages) for the import pattern to copy.

Coding agents see the same code. In a page's agent markdown, which feeds
[`llms-full.txt` and the `.md` pages](/docs/seo#llmstxt), each `LiveExample` is
written out as its source file in a `svelte` code block.

## Props playground

Pass a [props import](/docs/components/props-table) as `controls` and the example
grows a panel of controls, one for each prop whose type allows it. The
`children` snippet then receives the current values, so you decide where they
go:

<LiveExample controls={badgeProps}>
	{#snippet children(props)}
		<Badge {...props}>New</Badge>
	{/snippet}
</LiveExample>

```svelte
<script>
	import { Badge, LiveExample } from 'svelte-docsmith';
	import badgeProps from '$lib/badge.svelte?props';
</script>

<LiveExample controls={badgeProps}>
	{#snippet children(props)}
		<Badge {...props}>New</Badge>
	{/snippet}
</LiveExample>
```

The controls come from each prop's TypeScript type:

| Prop type                              | Control                                         |
| -------------------------------------- | ----------------------------------------------- |
| `boolean`                              | a switch                                        |
| a union of string or number literals   | buttons for up to four choices, a select beyond |
| `string`                               | a text field                                    |
| `number`                               | a number field                                  |
| anything else (snippets, callbacks, …) | no control                                      |

A prop starts at its default when that default is a literal like `'primary'`,
`false` or `3`. A prop without a literal default can be left unset, so the
component applies its own fallback. `@deprecated` props get no control.

Use `args` to start somewhere else, or to fill a required prop that has no
default. A prop set in `args` still gets its control, and **Reset** returns to
these values:

```svelte
<LiveExample controls={badgeProps} args={{ variant: 'success', href: '/docs' }}>
	{#snippet children(props)}
		<Badge {...props}>Docs</Badge>
	{/snippet}
</LiveExample>
```

Under the controls, a usage line such as `<Badge variant="success" external>…</Badge>`
shows the props that differ from their defaults, in the order the component
declares them, ready to copy.

<Callout variant="note" title="Experimental">

`controls` and `args` are outside the 1.0 stability promise for now. A control
doesn't follow changes the component makes to a `$bindable()` prop itself.

</Callout>

## API reference

<PropsTable of={liveExampleProps} />
