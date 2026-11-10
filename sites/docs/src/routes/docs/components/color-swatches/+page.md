---
title: Colour swatches
description: Show a palette's colours, and what each token resolves to in the current colour mode.
section: Components
order: 21
---

<script>
	import { ColorSwatch, ColorSwatches, PropsTable } from 'svelte-docsmith';
	import swatchProps from '$docsmith/components/docs/color-swatch.svelte?props';
	import swatchesProps from '$docsmith/components/docs/color-swatches.svelte?props';
</script>

`ColorSwatch` shows one colour, its name, and the value it resolves to. Give it
any CSS colour, CSS variables included, so a library can document its own
design tokens. Switch the colour mode and the values below change with it:
these are this site's own theme tokens.

<ColorSwatches>
	<ColorSwatch value="var(--background)" />
	<ColorSwatch value="var(--foreground)" />
	<ColorSwatch value="var(--primary)" />
	<ColorSwatch value="var(--primary-foreground)" />
	<ColorSwatch value="var(--secondary)" />
	<ColorSwatch value="var(--muted)" />
	<ColorSwatch value="var(--accent)" />
	<ColorSwatch value="var(--destructive)" />
	<ColorSwatch value="var(--border)" />
	<ColorSwatch value="var(--ring)" />
</ColorSwatches>

## Usage

`ColorSwatches` lays swatches out in a grid, as many columns as fit.

```svelte
<script>
	import { ColorSwatch, ColorSwatches } from 'svelte-docsmith';
</script>

<ColorSwatches>
	<ColorSwatch value="var(--brand)" />
	<ColorSwatch value="var(--brand-muted)" name="Brand, muted" />
	<ColorSwatch value="#3b82f6" />
	<ColorSwatch value="oklch(0.7 0.15 150 / 50%)" name="Translucent green" />
</ColorSwatches>
```

<ColorSwatches>
	<ColorSwatch value="var(--chart-1)" name="Chart 1" />
	<ColorSwatch value="var(--chart-2)" name="Chart 2" />
	<ColorSwatch value="#3b82f6" />
	<ColorSwatch value="oklch(0.7 0.15 150 / 50%)" name="Translucent green" />
</ColorSwatches>

The name defaults to the variable for `var(--x)`, and to the value for any
other colour. Below the name is the value the browser resolves, in the notation
your stylesheet uses. A token derived from others, such as a `color-mix()`,
shows the colour it comes out as. The value updates when the reader switches
colour mode, whether your site marks that with a class or attribute on the
`html` element or follows the system setting. It is left out when it would only
repeat the name. A translucent colour shows over a checkerboard.

The server can't know what a variable resolves to, so the page first shows the
value as written, and the browser fills in the resolved value as it loads.

## API reference

### ColorSwatch

<PropsTable of={swatchProps} />

### ColorSwatches

<PropsTable of={swatchesProps} />
