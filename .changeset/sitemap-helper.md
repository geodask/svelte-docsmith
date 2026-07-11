---
'svelte-docsmith': minor
---

Add a `generateSitemap` helper that builds a `sitemap.xml` body from the content index. Wire it into a `src/routes/sitemap.xml/+server.ts` and each doc page is listed with a `<lastmod>` from its last git commit. Pair it with a `static/robots.txt` pointing at the sitemap. See the SEO docs page.
