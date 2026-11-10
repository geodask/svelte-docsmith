---
title: Do & Don't
description: Show the right way and the wrong way side by side, for design guidelines.
section: Components
order: 20
---

<script>
	import { Badge, Columns, Do, Dont, Kbd, PropsTable } from 'svelte-docsmith';
	import doProps from '$docsmith/components/docs/do.svelte?props';
	import dontProps from '$docsmith/components/docs/dont.svelte?props';
</script>

`Do` and `Dont` are panels for design guidelines: what to do, and what to
avoid. Each has a coloured top edge and a label in words, with a tick or a
cross, so it reads without colour vision. Inside goes anything: text, an image
or a live component. Set a pair side by side with [Columns](/docs/components/columns).

<Columns>
<Do>

<p class="not-prose flex gap-2"><Badge variant="success">Stable</Badge> <Badge variant="warning">Beta</Badge></p>

Use one word that names the state.

</Do>
<Dont>

<p class="not-prose flex gap-2"><Badge variant="success">This is ready to use now</Badge></p>

Write a sentence in a badge. It wraps, and nobody reads it.

</Dont>
</Columns>

<Columns>
<Do>

Write a shortcut as the keys a reader presses: <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>.

</Do>
<Dont>

Write a shortcut as code, like `Ctrl+K`, which reads as something to type.

</Dont>
</Columns>

## Usage

Leave **blank lines** around the content so mdsvex reads the markdown inside.

<!-- prettier-ignore -->
```svelte
<script>
	import { Columns, Do, Dont } from 'svelte-docsmith';
</script>

<Columns>
<Do>

![A button labelled Save changes](./save-changes.png)

Name the action the button takes.

</Do>
<Dont>

![A button labelled OK](./ok.png)

Write a label that could mean anything.

</Dont>
</Columns>
```

The labels default to "Do" and "Don't". Pass `label` for other words, such as
`label="Avoid"` or the words of a site in another language.

## Colours

The panels use two theme tokens, `--docsmith-do` and `--docsmith-dont`. By
default they are a green and your theme's `--destructive`, each mixed a little
toward the text colour so the label stays readable in both colour modes. Set
either in your stylesheet to change it:

```css
:root {
	--docsmith-do: oklch(0.55 0.15 160);
}
```

## API reference

### Do

<PropsTable of={doProps} />

### Dont

<PropsTable of={dontProps} />
