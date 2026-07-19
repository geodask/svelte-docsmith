---
title: Theming
description: The whole look is design tokens behind one stylesheet. Restyle it by redefining tokens, not editing components.
section: Core Concepts
order: 8
---

<script>
	import ThemeGallery from '$lib/components/theme-gallery.svelte';
	import { Callout } from 'svelte-docsmith';
</script>

DocSmith ships its entire look as shadcn-style design tokens behind a single
stylesheet. You restyle the whole system by redefining tokens, not by touching
components, so a rebrand is a handful of CSS variables instead of a fork.

## One import, one contract

The style contract is one import on top of Tailwind:

```css title="src/app.css"
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';
```

`theme.css` does three things: it makes Tailwind scan the package so the
components' utility classes are generated, it registers the shadcn token set for
`:root` and `.dark`, and it pulls in the typography and animation plugins. Every
component reads those tokens, so the tokens are the only surface you style.

On its own, `theme.css` gives you the default theme, **Darkmatter**: a
near-monochrome shell with a warm orange primary. You import nothing else to get
it.

## The presets

Eleven presets ship in the box. Pick one below to preview it, and toggle the
site's dark mode to see both sides:

<ThemeGallery />

A preset is a stylesheet that redefines the color tokens, and for some the corner
radius, and nothing else. Import it after `theme.css` and it wins:

```css title="src/app.css"
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';
@import 'svelte-docsmith/themes/amethyst.css';
```

Darkmatter is already baked into `theme.css`, so you only import
`themes/darkmatter.css` to return to it after trying another preset.

Available: `darkmatter` (default), `tangerine`, `amethyst`, `graphite`,
`evergreen`, `rose`, `ocean`, `nord`, `claude`, `bubblegum`, and `mono`. Each
covers light and dark. Want your own brand color instead? Skip the preset and
override the tokens directly.

## Overriding tokens

Redefine any token after the import and it wins. Tokens are OKLCH, so change the
primary and every button, link, and accent follows:

```css title="src/app.css"
@import 'tailwindcss';
@import 'svelte-docsmith/theme.css';

:root {
	--primary: oklch(0.55 0.2 265); /* your brand color */
	--radius: 0.5rem; /* tighter corners */
}
```

<Callout variant="warning" title="Order decides the winner">

If an override is not taking effect, import order is almost always the cause.
Your redefinition has to come after the `theme.css` import, or the package's own
value wins. The same rule applies to preset stylesheets.

</Callout>

## The token set

The tokens are standard shadcn. The ones you reach for most:

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

Dark mode is class-based: every token has a `.dark` variant, and DocSmith styles
respond to a `dark` class on the `<html>` element. The docs site toggles it with
[`mode-watcher`](https://github.com/svecosystem/mode-watcher). Drop its
`<ModeWatcher />` in your root layout and the theme toggle and system preference
work out of the box.

An override only covers the theme whose selector you write it under, so set a
token for both modes to change both:

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
