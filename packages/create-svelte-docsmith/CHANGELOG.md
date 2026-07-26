# create-svelte-docsmith

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
