---
'create-svelte-docsmith': minor
---

Add `create-svelte-docsmith`. Running `npm create svelte-docsmith@latest my-docs` (or the pnpm/yarn/bun equivalent) scaffolds a ready-to-run SvelteKit + Tailwind v4 project wired with DocSmith: the markdown preprocessor, the Vite plugin, the style contract, a `DocsShell` layout, a 404 page, and two sample doc pages.

An interactive flow (with sensible defaults) asks for the target directory, site title, and theme preset, and offers to install dependencies and initialize a git repository. Passing a directory argument or running in a non-interactive shell falls back to the defaults.
