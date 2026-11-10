---
title: Props Table
description: Document a component's API in a consistent table, generated from its source.
section: Components
order: 19
---

<script>
	import { Callout, PropsTable, Prop } from 'svelte-docsmith';
	import badgeProps from '$docsmith/components/docs/badge.svelte?props';
	import propsTableProps from '$docsmith/components/docs/props-table.svelte?props';
	import propProps from '$docsmith/components/docs/prop.svelte?props';
</script>

Document a component's props the same way on every page: name, type, default
and description in one styled table. Generate it from the component's own source
and the reference can never drift from the code; write the rows by hand when
there is no component to read. Here is `Badge`'s, generated:

<PropsTable of={badgeProps} />

## Generated from your component

Import the component with the `?props` query and pass the result to `of`. The
`docsmith()` Vite plugin reads the component's typed `$props()` at build time,
the same way `?source` feeds `LiveExample`:

<!-- prettier-ignore -->
```svelte
<script>
	import { PropsTable } from 'svelte-docsmith';
	import buttonProps from '#lib/button.svelte?props';
</script>

<PropsTable of={buttonProps} />
```

Everything comes from the component, so there is nothing to keep in sync on the
page:

- **Types** are read by the TypeScript checker, so an imported alias such as
  `ButtonVariant` shows its values, not its name.
- **Descriptions** are the JSDoc on each prop, with markdown rendered.
- **Defaults** come from the `$props()` destructuring. A `@default` tag wins, for
  defaults the code can't say plainly.
- **Every prop gets a row**, snippets and callbacks included. `$bindable()` props
  are marked `bindable`, `@deprecated` ones `deprecated`, and `@internal` ones
  are left out.
- **Inherited attributes** collapse to one line. A component typed
  `Props & HTMLButtonAttributes` reads "Also accepts every `<button>` attribute"
  rather than listing hundreds of them.

The caption is the component's name (`Select<T>` for a generic component); pass
`title` to change it.

Coding agents read the same table. In a page's agent markdown, which feeds
[`llms-full.txt` and the `.md` pages](/docs/seo#llmstxt), a generated props table
is written out as a markdown table with the same rows.

<Callout variant="note" title="Setup">
	Generated tables need TypeScript: <code>npm i -D typescript svelte2tsx</code>. Then add
	<code>/// &lt;reference types="svelte-docsmith/client" /&gt;</code> to
	<code>src/app.d.ts</code> so <code>?props</code> (and <code>?source</code>) imports are
	typed. Point the import at your component's source, not a published package:
	publishing strips the types out of <code>.svelte</code> files. Anything the plugin
	can't read becomes a build warning naming the file, never a failed build.
</Callout>

<Callout variant="warning" title="Experimental">
	Generated props tables sit outside the 1.0 stability promise while authors try
	them for real.
</Callout>

## Written by hand

Wrap `Prop` rows in a `PropsTable`. Give each `Prop` a `name`; add `type`,
`default`, `required`, `bindable` or `deprecated` as needed, and put the
description in the body.

<PropsTable>
	<Prop name="variant" type="'default' | 'primary'" default="'default'">
		Visual intent of the component.
	</Prop>
	<Prop name="href" type="string" required>
		Turns the element into a link.
	</Prop>
</PropsTable>

<!-- prettier-ignore -->
```svelte
<script>
	import { PropsTable, Prop } from 'svelte-docsmith';
</script>

<PropsTable>
	<Prop name="variant" type="'default' | 'primary'" default="'default'">
		Visual intent of the component.
	</Prop>
	<Prop name="href" type="string" required>
		Turns the element into a link.
	</Prop>
</PropsTable>
```

## API reference

### PropsTable

<PropsTable of={propsTableProps} />

### Prop

<PropsTable of={propProps} />
