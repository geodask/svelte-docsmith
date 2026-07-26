---
'svelte-docsmith': patch
---

- Fix the version switcher sending readers to the landing page instead of the matching page, on sites serving their docs from the routes root
- Accept a path without a leading slash in `generateSitemap` entries and in `generateFeed`'s `path`, joining it to the origin with exactly one slash
- Tolerate any number of trailing slashes on a configured `url` or `editUrl`, not just one, wherever a URL is built from it
- Build every doc URL through one internal vocabulary, replacing three disagreeing trailing-slash regexes and three copies of the segment-boundary rule
