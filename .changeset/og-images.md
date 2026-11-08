---
'svelte-docsmith': minor
---

Give every doc page its own OG image. `ogImages()` from `svelte-docsmith/server` draws a 1200×630 PNG per page at build time: the site title, the page's section, title and description, and the site's host, in your theme's colours (read from the theme file, so it matches any preset or theme file of your own). Add it as `src/routes/og/[...slug].png/+server.ts` with `export const { GET, entries } = ogImages()`, set `site.ogImages: '/og'`, and `DocsShell` points each doc page's `og:image` and `twitter:image` at its own image. Pages that aren't doc pages keep `site.ogImage`. The images are drawn with `satori` and `@resvg/resvg-js`, new optional peer dependencies: install them in the docs app to use this, and nothing changes for sites that don't.
