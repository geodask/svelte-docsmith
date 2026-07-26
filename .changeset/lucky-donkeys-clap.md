---
'create-svelte-docsmith': patch
---

- Scaffolded `site-config.ts` now calls `defineConfig()` instead of annotating with `DocsmithConfig`, so a bad config fails with a clear error instead of a blank header
