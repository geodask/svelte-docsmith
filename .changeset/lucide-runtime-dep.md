---
'svelte-docsmith': patch
---

Declare `@lucide/svelte` as a runtime dependency. The shipped components import icons from `@lucide/svelte/icons/*`, but it was listed only under `devDependencies`, so standalone consumers (anything outside this monorepo, including projects scaffolded with `create-svelte-docsmith`) failed to build with "failed to resolve import @lucide/svelte/icons/...". The dogfood docs site masked it because the workspace already had the package installed.
