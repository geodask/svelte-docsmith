---
'svelte-docsmith': patch
'create-svelte-docsmith': patch
---

- `ErrorPage` takes a `versions` prop and forwards it to the shell, so an error under an archived prefix keeps that version's search scope, switcher, and `noindex` instead of falling back to the current version.
- `ErrorPage`'s `search` prop now receives the active version id, matching `DocsShell`.
- The scaffolded `+error.svelte` passes `versions` (a no-op until you declare versions).
