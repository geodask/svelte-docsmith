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
both colour modes. To start your own theme from one, open it in the
[theme builder](/themes).

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

## Build a theme

The [theme builder](/themes) makes a theme file without writing CSS. Start from
a preset, your brand colour or a tweakcn export, adjust it with a few guided
controls or token by token, and watch a real docs page follow, in light and
dark side by side. It warns about any text and surface pair below WCAG AA
contrast.

When it looks right, take it to your project. The quickest way is to run this
from your docs app:

```bash
npx svelte-docsmith theme
```

It opens the builder in your browser. Press **Send to my project** there and the
command writes the theme to `src/theme.css` and sets `theme: './src/theme.css'`
in the `docsmith()` call in `vite.config.ts`. A running `vite dev` picks it up
straight away. If it can't find that call, it still writes the file and tells you
the line to add. Nothing leaves your machine: the browser sends the theme straight
to the command, which listens on `127.0.0.1` only and accepts one send, from the
tab it opened.

If the browser can't reach the terminal, because the command runs in a
container or over SSH, the builder shows a short code under **Didn't arrive?**.
Paste it at the command's prompt instead.

| Option            | What it does                                                               |
| ----------------- | -------------------------------------------------------------------------- |
| `--link <url>`    | Write the theme a [theme link](#theme-links) carries, without the browser. |
| `--file <path>`   | Where to write the theme file. Default `src/theme.css`.                    |
| `--config <file>` | The vite config to update. Default `vite.config.*` here.                   |
| `--builder <url>` | The builder to open. Default the one on this site.                         |
| `--no-open`       | Print the builder link instead of opening a browser.                       |

You can also skip the command: the builder's Export tab copies or downloads the
theme file, for the `theme` option as in [Your own theme](#your-own-theme).

### Theme links

**Copy theme link** in the Export tab gives a link that reopens the builder on
exactly that theme, to share with a teammate or come back to later. Run
`npx svelte-docsmith theme --link '<link>'` to write the theme a link carries
straight into a project.

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

## For agents

An agent can make a theme without the builder. Write a theme file: a `:root`
block and a `.dark` block, setting the colour tokens above as `oklch()` values,
plus any of the others. Save it as `src/theme.css` and set
`theme: './src/theme.css'` in `docsmith()`. Keep body text at 4.5:1 contrast on
its surface and `--primary` at 3:1 on `--background`.

To hand the theme to a person to look at and adjust, give them a theme link.
The format is stable: `https://docsmith.geodask.com/themes#theme=` followed by
base64url of raw deflate of this JSON.

```json
{
	"v": 1,
	"tokens": {
		"light": { "background": "oklch(1 0 0)", "primary": "oklch(0.55 0.2 265)" },
		"dark": { "background": "oklch(0.18 0 0)", "primary": "oklch(0.7 0.16 265)" }
	}
}
```

Token names have no leading `--`. `light` and `dark` each hold a whole mode, and
a token either leaves out is generated from the rest. An optional `inputs`
object only sets the builder's guided controls, and is inferred when missing.
This script builds the link from a theme file:

```js title="theme-link.mjs"
import { readFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';

const css = readFileSync(process.argv[2] ?? 'src/theme.css', 'utf8');
const tokens = (selector) => {
	const body = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
	return Object.fromEntries(
		[...body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])
	);
};
const light = tokens(':root');
const dark = { ...light, ...tokens('\\.dark') };
const payload = deflateRawSync(JSON.stringify({ v: 1, tokens: { light, dark } }));
console.log(`https://docsmith.geodask.com/themes#theme=${payload.toString('base64url')}`);
```

`npx svelte-docsmith theme --link '<link>'` writes a link's theme into a
project, so an agent and a person can pass one theme back and forth.

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
