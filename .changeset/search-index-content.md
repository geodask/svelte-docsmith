---
'svelte-docsmith': minor
---

Emit a searchable body-text index. The `docsmith()` Vite plugin now serves a second virtual module, `svelte-docsmith/search`, alongside `svelte-docsmith/content`. It exports one record per page — `{ path, title, section, description, headings, text }` — where `text` is the page's prose and headings reduced to plain text (frontmatter, `<script>` blocks, fenced code, tags, and markdown punctuation removed). It is a separate chunk from the nav index so it can be lazy-loaded only when needed. This is the data layer for upcoming full-text search; the new `SearchDoc` type is exported from the package root.
