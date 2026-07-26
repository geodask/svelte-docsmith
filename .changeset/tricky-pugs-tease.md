---
'svelte-docsmith': minor
---

`svelte-docsmith/vite` now exports only `docsmith` and `DocsmithViteOptions`. The `collectDocs`, `collectSearchDocs`, `collectLlmsDocs` and `collectReleases` re-exports are gone: they were internal build steps that the plugin's own tests reached through the package entry, never part of its contract.

- Build the content, search and llms indexes as projections of one source-page list, instead of three independent scans of the docs root
- Report a missing or empty docs root from the plugin, so index building no longer writes to the console
