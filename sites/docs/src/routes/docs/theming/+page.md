---
title: Theming
description: Override the design tokens to make the system your own.
section: Core Concepts
order: 7
---

<script>
	import ThemeGallery from '$lib/components/theme-gallery.svelte';
	import { Callout } from 'svelte-docsmith';
</script>

## One import, one contract

The entire look ships as design tokens behind a single stylesheet import:

```css
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';
```

`theme.css` makes Tailwind scan the package, registers the shadcn token set for
`:root` and `.dark`, and pulls in the typography and animation plugins. Every
component reads these tokens, so you rebrand the whole system by redefining
tokens, not by editing components.

## Pre-installed themes

The default look is **Tangerine**. Six presets ship in the box. Pick one below to
preview it, and toggle the site's dark mode to see both:

<ThemeGallery />

To use a preset, import its stylesheet _after_ `theme.css`. It redefines the
color tokens (and, for some, the corner radius) and nothing else:

```css
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';
@import 'svelte-docsmith/themes/amethyst.css';
```

Bundled presets: **Tangerine** (default, warm terracotta), **Amethyst** (violet),
**Graphite** (near-monochrome, tighter corners), **Evergreen** (deep green),
**Rosé** (warm rose, rounder corners), and **Ocean** (cool teal-blue). Each
covers light and dark. Want your own brand color instead? Skip the preset and
override tokens directly.

## Override a token

Redefine any token _after_ the import and it wins. Tokens are OKLCH; change the
primary color and every button, link, and accent follows:

```css
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';

:root {
	--primary: oklch(0.55 0.2 265); /* your brand color */
	--radius: 0.5rem; /* tighter corners */
}
```

<Callout type="warning" title="Order decides the winner">

If an override isn't taking effect, import order is almost always the cause.
Your redefinition has to come _after_ the `theme.css` import, or the package's
own value wins. The same rule applies to preset stylesheets.

</Callout>

## The tokens

The set is standard shadcn. The ones you'll reach for most:

| Token                                | Controls                              |
| ------------------------------------ | ------------------------------------- |
| `--background` / `--foreground`      | Page surface and body text            |
| `--primary` / `--primary-foreground` | Brand color and text on it            |
| `--muted` / `--muted-foreground`     | Quiet fills and secondary text        |
| `--accent` / `--accent-foreground`   | Hover and highlight surfaces          |
| `--border` / `--input` / `--ring`    | Hairlines, field borders, focus rings |
| `--card` / `--popover`               | Raised surfaces                       |
| `--sidebar*`                         | The docs sidebar, tokened separately  |
| `--radius`                           | Corner rounding across the system     |

## Dark mode

Dark mode is class-based: tokens have a `.dark` variant, and DocSmith styles
respond to a `dark` class on the `<html>` element. The docs site toggles it with
[`mode-watcher`](https://github.com/svecosystem/mode-watcher). Drop its
`<ModeWatcher />` in your root layout and the theme toggle and system preference
work out of the box.

Override tokens for both themes by redefining them under each selector:

```css
:root {
	--primary: oklch(0.55 0.2 265);
}
.dark {
	--primary: oklch(0.7 0.16 265); /* lighter, for the dark surface */
}
```

## Fonts

Three families are set as tokens: `--font-sans`, `--font-serif`, and
`--font-mono`. Point them at your own faces and load the fonts however you
normally would (a `<link>` in `app.html`, `@fontsource`, or your host):

```css
:root {
	--font-sans: 'Geist', sans-serif;
	--font-mono: 'Geist Mono', monospace;
}
```
