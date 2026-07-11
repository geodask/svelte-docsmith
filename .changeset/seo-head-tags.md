---
'svelte-docsmith': minor
---

Emit SEO head tags from frontmatter. `DocsShell` now renders `<title>`, `<meta name="description">`, canonical, and Open Graph / Twitter Card tags for every page — no per-page wiring. Doc pages get their title and description straight from frontmatter (via the content index); other pages fall back to the site title and the new `config.description`.

- New optional config fields: `description` (default meta description), `url` (canonical origin — enables `<link rel="canonical">` and absolute `og:url`), and `ogImage` (default share image).
- New `DocsShell` prop `seo={{ title?, description? }}` to set or override the head on non-doc pages (landing pages, custom routes).

Previously pages shipped with no `<title>` or meta description at all.
