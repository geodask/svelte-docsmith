# The `docsmith()` call chooses the theme

A site picks its look with a hand-written CSS `@import` in `app.css` (`svelte-docsmith/theme.css`, then optionally `themes/<preset>.css`), while ADR 0009 made `docsmith()` the only place a site is configured. `theme.css` also carries the Darkmatter colours, so the default theme is a special case rather than a preset. And "theme" names three things: the CSS presets, the `themes` option (Shiki code highlighting) and `ThemeProvider`/`ThemeToggle` (light and dark).

Now `docsmith({ theme })` chooses the theme. It takes one string: a preset name (`'ocean'`) or a path to a theme file (`'./src/theme.css'`), and defaults to `'darkmatter'`. `theme.css` keeps only the base styles (Tailwind scanning, token registration, plugins) and no colours. A theme file is plain CSS of `:root` and `.dark` tokens in the shape shadcn and tweakcn export, so a tweakcn theme drops in unchanged. Token overrides written in `app.css` after `theme.css` still win.

The words follow `CONTEXT.md`: the top-level `themes` option becomes `codeTheme`, and `ThemeProvider`/`ThemeToggle` become `ModeProvider`/`ModeToggle`. The old names stay as deprecated aliases for one minor.

## Considered Options

- **Keep the CSS import as the way to choose.** Rejected: it is configuration outside the one call, the CLI and a builder would have to edit CSS to change it, and the code theme could not follow the theme.
- **Accept an object of token overrides** (`{ preset, tokens }`). Rejected: a second, smaller theme format beside the file. Fine tweaks stay in CSS.
- **A TypeScript or JSON theme format** that DocSmith compiles to CSS. Rejected: easier to validate, but it is ours alone, and the token set already matches tweakcn's.
- **Rename without aliases**, as ADR 0009 broke cleanly. Rejected: unlike a duplicated preprocessor, an alias costs nothing at runtime.

## Consequences

- A site with no `theme` option gets Darkmatter from the plugin, not from `theme.css`. Sites that import `themes/<preset>.css` by hand keep working, since it is plain CSS after `theme.css`, but the docs show only the option.
- The scaffolder writes `theme` into `vite.config.ts` instead of an `@import` into `app.css`.
- A theme file is the unit the builder exports, the CLI writes and an agent produces.
