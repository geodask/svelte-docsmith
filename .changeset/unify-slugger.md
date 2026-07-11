---
'svelte-docsmith': patch
---

Fix server-rendered TOC anchors that could miss their heading. The build-time TOC extractor used a hand-rolled slugifier that only approximated `rehype-slug`, so headings with punctuation or symbols drifted — e.g. `## Anchors & copy buttons` rendered the id `anchors--copy-buttons` but the TOC linked `#anchors-copy-buttons`, a dead anchor until hydration re-scanned the DOM. The extractor now slugs with the same `github-slugger` `rehype-slug` uses, including its duplicate-suffixing, so SSR TOC links resolve on first paint for every heading.
