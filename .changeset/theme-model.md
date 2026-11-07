---
'svelte-docsmith': minor
'create-svelte-docsmith': minor
---

Choose the theme in `docsmith()`, and let code blocks follow it. A theme is now the whole look in one CSS file, colours, radius, fonts, shadows and code colours for light and dark, and `docsmith({ theme })` picks it: a preset name or a path to a theme file of your own. A theme file is a `:root` and a `.dark` block of tokens, the shape tweakcn and shadcn export, so a tweakcn theme works pasted as it is (its `@theme inline` block is ignored). The plugin adds the theme to the stylesheet `svelte-docsmith/theme.css` compiles into, in the `base` layer, so every page that imports it is themed on first paint and a token you redefine in `app.css` wins whatever order the imports are in. Edits to a theme file hot-update in `vite dev`. An unknown preset name or a missing theme file fails when Vite starts.

```ts
// vite.config.ts
docsmith({
	site: { title: 'My Library' },
	theme: 'ocean' // or './src/theme.css'; default 'darkmatter'
});
```

Code blocks now read `--code-*` tokens, so they match the theme in both colour modes, and switching theme recolours them with no rebuild. Every preset sets its own syntax colours, each readable on its background, and a theme without them gets colours mixed from its palette. `codeTheme: { light, dark }` names an exact Shiki pair instead and renders as before. The presets based on a tweakcn theme now carry that theme's shadows too.

`ThemeProvider` and `ThemeToggle` are renamed `ModeProvider` and `ModeToggle`, since they control light and dark rather than the theme, and the `themes` option is renamed `codeTheme`. `create-svelte-docsmith` writes the chosen preset into `vite.config.ts` as `theme` instead of importing it in `app.css`.

**Upgrading:** move a preset import from `app.css` to the option: `@import 'svelte-docsmith/themes/ocean.css';` becomes `theme: 'ocean'`. The old import keeps working, as it is plain CSS that wins over the default, but the option is now the documented way. `theme.css` no longer carries colours of its own, so it needs the `docsmith()` plugin to look right, as the rest of the shell already does. Code blocks change colour by default, because they follow the theme: set `codeTheme: { light: 'github-light', dark: 'github-dark' }` to keep the old look. `themes`, `ThemeProvider` and `ThemeToggle` still work, with a deprecation notice for `themes`, and are removed in the next minor; setting both `themes` and `codeTheme` fails at startup. See https://docsmith.geodask.com/docs/theming.
