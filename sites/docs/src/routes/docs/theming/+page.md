---
title: Theming
description: A theme is the whole look in one CSS file. Pick a preset or bring your own, and every component and code block follows it.
section: Core Concepts
order: 8
---

<script>
	import PresetList from '#lib/components/preset-list.svelte';
	import ThemeTokens from '#lib/components/theme-tokens.svelte';
	import { Callout } from 'svelte-docsmith';
</script>

A **theme** is the whole look of a site in one CSS file: colours, radius, fonts,
shadows and code colours, for light and dark. Every component reads those
tokens and nothing else, so changing the theme restyles the whole site, code
blocks included, without touching a component.

## Choosing a theme

The theme is chosen where the rest of the site is configured, in `docsmith()`:

```ts title="vite.config.ts"
docsmith({
	site: { title: 'My Docs' },
	theme: 'ocean'
});
```

`theme` takes a preset name or a path to a theme file of your own. Leave it out
and you get **Darkmatter**, a near-monochrome shell with a warm orange primary.

Your stylesheet stays the same whatever the theme is:

```css title="src/app.css"
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';
```

`theme.css` makes Tailwind scan the package, registers the tokens and pulls in
the typography and animation plugins. The plugin adds the theme's values to it,
so every page that imports it is themed, with no flash on first paint.

## The presets

Eleven presets ship in the box. Pick one to apply it across this site, then
toggle dark mode to see both sides:

<PresetList />

Available: `darkmatter`, `tangerine`, `amethyst`, `graphite`, `evergreen`,
`rose`, `ocean`, `nord`, `claude`, `bubblegum`, and `mono`. Each one sets
colours, radius, code colours and, where its look calls for it, shadows, for
both colour modes. The [themes page](/themes) shows every component in each.

## Your own theme

A theme file is plain CSS: a `:root` block for light and a `.dark` block for
dark, setting the tokens below. Point `theme` at it, relative to the Vite root:

```ts title="vite.config.ts"
docsmith({ site: { title: 'My Docs' }, theme: './src/theme.css' });
```

```css title="src/theme.css"
:root {
	--background: oklch(0.99 0.005 215);
	--foreground: oklch(0.26 0.02 225);
	--primary: oklch(0.55 0.2 265);
	--primary-foreground: oklch(0.99 0 0);
	/* …the rest of the colour tokens */
	--radius: 0.5rem;
}

.dark {
	--background: oklch(0.18 0.01 225);
	--foreground: oklch(0.93 0.01 215);
	--primary: oklch(0.7 0.16 265);
	--primary-foreground: oklch(0.18 0.01 225);
}
```

It's the same shape [tweakcn](https://tweakcn.com/) and shadcn export, so a
theme built there works as it is: paste the export into the file. Its
`@theme inline` block is ignored, since `theme.css` already does that job.

Set every colour token (the [table below](#the-tokens) lists them): colours have
no default, so a missing one leaves its surface unpainted. Anything else the
file leaves out keeps its default: radius, fonts, shadows and spacing fall back
to `theme.css`, and code colours are mixed from the theme's palette. `vite dev`
picks up every edit to the file without a restart.

<Callout variant="note" title="Load fonts yourself">

A theme can name font families, but it can't load them: an `@import` in a theme
file is left out, with a warning. Load the font in `app.css` or `app.html` as
you normally would, and set the family in the theme.

</Callout>

## Overriding tokens

To adjust one or two tokens without writing a theme, redefine them in `app.css`.
Your value always wins over the theme, whatever order the imports are in:

```css title="src/app.css"
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';

:root {
	--primary: oklch(0.55 0.2 265); /* your brand color */
	--radius: 0.5rem;
}
.dark {
	--primary: oklch(0.7 0.16 265); /* lighter, for the dark surface */
}
```

A token set under `:root` covers light mode and anything dark mode doesn't set
itself, so set colours under both selectors to change both modes.

## The tokens

The full set, with Darkmatter's light values or the fallback `theme.css` gives
when a theme leaves a token out:

<ThemeTokens />

## Code colours

Code blocks read the `--code-*` tokens, so they follow the theme in light and
dark with no setting. Each preset sets its own syntax colours, chosen from its
palette and readable on its background. A theme without them gets colours mixed
from its primary and chart colours.

To use an exact Shiki theme instead, name a pair:

```ts title="vite.config.ts"
docsmith({
	site: { title: 'My Docs' },
	codeTheme: { light: 'github-light', dark: 'github-dark' }
});
```

`codeTheme` takes any [Shiki theme](https://shiki.style/themes) names and
ignores the `--code-*` tokens.

## Dark mode

Dark mode is class-based: a theme's `.dark` block applies when the `dark` class
is on `<html>`. `DocsShell` mounts `ModeProvider`, which sets that class,
follows the reader's system preference and remembers their choice, and the
header's `ModeToggle` switches it. You install and wire nothing.

For a page you build outside `DocsShell`, wrap it in `ModeProvider`:

```svelte title="src/routes/+layout.svelte"
<script>
	import { ModeProvider } from 'svelte-docsmith';
	let { children } = $props();
</script>

<ModeProvider>{@render children()}</ModeProvider>
```

## Fonts

Three families are tokens: `--font-sans`, `--font-serif` and `--font-mono`.
`theme.css` loads Inter, Source Serif 4 and JetBrains Mono for the defaults. To
use your own, load the faces however you normally would (a `<link>` in
`app.html`, `@fontsource`, or your host) and set the families in your theme or
`app.css`:

```css
:root {
	--font-sans: 'Geist', sans-serif;
	--font-mono: 'Geist Mono', monospace;
}
```
