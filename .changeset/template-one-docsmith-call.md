---
'create-svelte-docsmith': minor
---

New projects configure the whole site in the one `docsmith()` call in `vite.config.ts`, for svelte-docsmith 0.20: the site title, nav and footer live under `site`, there is no `src/lib/site-config.ts`, and no markdown preprocessor to register.
