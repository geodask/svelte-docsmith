# create-svelte-docsmith

## 0.6.7

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.29.0` so freshly scaffolded projects install the current release.

## 0.6.6

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.28.0` so freshly scaffolded projects install the current release.

## 0.6.5

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.27.0` so freshly scaffolded projects install the current release.

## 0.6.4

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.26.0` so freshly scaffolded projects install the current release.

## 0.6.3

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.25.0` so freshly scaffolded projects install the current release.

## 0.6.2

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.24.0` so freshly scaffolded projects install the current release.

## 0.6.1

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.23.0` so freshly scaffolded projects install the current release.

## 0.6.0

### Minor Changes

- 94b87cd: Choose the theme in `docsmith()`, and let code blocks follow it. A theme is now the whole look in one CSS file, colours, radius, fonts, shadows and code colours for light and dark, and `docsmith({ theme })` picks it: a preset name or a path to a theme file of your own. A theme file is a `:root` and a `.dark` block of tokens, the shape tweakcn and shadcn export, so a tweakcn theme works pasted as it is (its `@theme inline` block is ignored). The plugin adds the theme to the stylesheet `svelte-docsmith/theme.css` compiles into, in the `base` layer, so every page that imports it is themed on first paint and a token you redefine in `app.css` wins whatever order the imports are in. Edits to a theme file hot-update in `vite dev`. An unknown preset name or a missing theme file fails when Vite starts.

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

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.22.0` so freshly scaffolded projects install the current release.

## 0.5.2

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.21.0` so freshly scaffolded projects install the current release.

## 0.5.1

### Patch Changes

- 373cb06: - The landing page of a new project shows the site title again. It was left as an unfilled `{{ SITE_TITLE }}` placeholder, and now reads the title from `site` in `vite.config.ts`.
  - A site title with a quote, such as `Bob's Docs`, no longer breaks `vite.config.ts`.
- cc992d1: The theme prompt's preset list is now generated from the library's preset CSS instead of written by hand, so it can't fall out of step with the presets the library ships. Rosé is now spelled as the library names it.

## 0.5.0

### Minor Changes

- 383a0a3: New projects configure the whole site in the one `docsmith()` call in `vite.config.ts`, for svelte-docsmith 0.20: the site title, nav and footer live under `site`, there is no `src/lib/site-config.ts`, and no markdown preprocessor to register.

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.20.0` so freshly scaffolded projects install the current release.

## 0.4.5

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.19.0` so freshly scaffolded projects install the current release.

## 0.4.4

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.18.0` so freshly scaffolded projects install the current release.

## 0.4.3

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.17.0` so freshly scaffolded projects install the current release.

## 0.4.2

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.16.0` so freshly scaffolded projects install the current release.

## 0.4.1

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.15.0` so freshly scaffolded projects install the current release.

## 0.4.0

### Minor Changes

- 22b2241: Support SvelteKit 3. `svelte-docsmith` now accepts `@sveltejs/kit` `^2.16.0 || ^3.0.0` as its peer, so existing SvelteKit 2 sites keep working unchanged. New projects from `create-svelte-docsmith` start on SvelteKit 3: configuration lives in `vite.config.ts` (`sveltekit({ extensions, preprocess, adapter })`) and your own files are imported from `#lib`. The archive notice now also lists `#lib` imports.

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.14.0` so freshly scaffolded projects install the current release.

## 0.3.4

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.13.0` so freshly scaffolded projects install the current release.

## 0.3.3

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.12.0` so freshly scaffolded projects install the current release.

## 0.3.2

### Patch Changes

- 8443cba: - Scaffolded `site-config.ts` now calls `defineConfig()` instead of annotating with `DocsmithConfig`, so a bad config fails with a clear error instead of a blank header
- Pin the starter template to `svelte-docsmith@^0.11.0` so freshly scaffolded projects install the current release.

## 0.3.1

### Patch Changes

- 8cfcab7: - `ErrorPage` takes a `versions` prop and forwards it to the shell, so an error under an archived prefix keeps that version's search scope, switcher, and `noindex` instead of falling back to the current version.
  - `ErrorPage`'s `search` prop now receives the active version id, matching `DocsShell`.
  - The scaffolded `+error.svelte` passes `versions` (a no-op until you declare versions).
- Pin the starter template to `svelte-docsmith@^0.10.0` so freshly scaffolded projects install the current release.
- ff7f94e: - Scaffolded `sitemap.xml` and `llms.txt` endpoints now scope to the current docs version (a no-op until you declare versions).

## 0.3.0

### Minor Changes

- fd1caa0: Scaffold a landing page. The site root was a redirect into `/docs/introduction`; it is now a real `+page.svelte` built from the new landing sections, with a hero carrying your site title, a six-cell feature grid, and a closing call to action. So `npm create svelte-docsmith` produces a complete site rather than only a docs section, and the page doubles as a worked example to edit. Delete it and add a `+page.ts` redirect back if you'd rather not have one.

### Patch Changes

- Pin the starter template to `svelte-docsmith@^0.9.0` so freshly scaffolded projects install the current release.

## 0.2.1

### Patch Changes

- 0bf1a19: Pin the starter template to `svelte-docsmith@^0.8.0` (it was pinned to `^0.5.1`, so freshly scaffolded projects installed a version three minors behind the current release — missing the Darkmatter default theme the template's `app.css` comment already describes, plus reading time, code-block annotations, the feedback widget, nested sidebar sections, synced tabs, and the announcement bar).

## 0.2.0

### Minor Changes

- a6eb3bc: Scaffold AI-ready, SEO-ready projects. The template now ships a `sitemap.xml` and `robots.txt`, `llms.txt` / `llms-full.txt` endpoints, a catch-all `[...slug].md` route for per-page Markdown, and enables the `copyPage` "Copy page" button on `DocsShell`. The `site-config.ts` gains commented `url` and `editUrl` hints, and the template pins `svelte-docsmith@^0.5.1`.

## 0.1.1

### Patch Changes

- 7c43fa1: Pin the starter template to `svelte-docsmith@^0.4.0` (it was pinned to `^0.3.0`, so freshly scaffolded projects installed a version behind the current release).

## 0.1.0

### Minor Changes

- 0a69c92: Add `create-svelte-docsmith`. Running `npm create svelte-docsmith@latest my-docs` (or the pnpm/yarn/bun equivalent) scaffolds a ready-to-run SvelteKit + Tailwind v4 project wired with DocSmith: the markdown preprocessor, the Vite plugin, the style contract, a `DocsShell` layout, a 404 page, and two sample doc pages.

  An interactive flow (with sensible defaults) asks for the target directory, site title, and theme preset, and offers to install dependencies and initialize a git repository. Passing a directory argument or running in a non-interactive shell falls back to the defaults.
