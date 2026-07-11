# create-svelte-docsmith

## 0.1.1

### Patch Changes

- 7c43fa1: Pin the starter template to `svelte-docsmith@^0.4.0` (it was pinned to `^0.3.0`, so freshly scaffolded projects installed a version behind the current release).

## 0.1.0

### Minor Changes

- 0a69c92: Add `create-svelte-docsmith`. Running `npm create svelte-docsmith@latest my-docs` (or the pnpm/yarn/bun equivalent) scaffolds a ready-to-run SvelteKit + Tailwind v4 project wired with DocSmith: the markdown preprocessor, the Vite plugin, the style contract, a `DocsShell` layout, a 404 page, and two sample doc pages.

  An interactive flow (with sensible defaults) asks for the target directory, site title, and theme preset, and offers to install dependencies and initialize a git repository. Passing a directory argument or running in a non-interactive shell falls back to the defaults.
