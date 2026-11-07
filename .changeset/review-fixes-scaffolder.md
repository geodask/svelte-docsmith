---
'create-svelte-docsmith': patch
---

- The landing page of a new project shows the site title again. It was left as an unfilled `{{ SITE_TITLE }}` placeholder, and now reads the title from `site` in `vite.config.ts`.
- A site title with a quote, such as `Bob's Docs`, no longer breaks `vite.config.ts`.
