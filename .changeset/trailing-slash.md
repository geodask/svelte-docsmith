---
'svelte-docsmith': patch
---

Normalize trailing slashes when matching the current route. `/docs/intro/` and `/docs/intro` now resolve to the same page, so the SEO tags, "Edit this page" link, prev/next nav, sidebar highlight, and canonical URL all work regardless of the app's SvelteKit `trailingSlash` setting (they previously broke on a trailing slash).
