---
'svelte-docsmith': patch
---

Omit git-derived page dates on a shallow clone instead of dating every page the same day. A shallow history makes the walk look successful while stamping every file with the tip commit, which turns sitemap `<lastmod>` into uniform noise. The build warns and leaves `lastUpdated` unset (frontmatter still wins); use a full clone (`fetch-depth: 0`) when real dates matter.
