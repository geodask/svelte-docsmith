---
'svelte-docsmith': minor
---

Publish your releases as a page and a feed. The `docsmith()` plugin now parses a Changesets `CHANGELOG.md` into the generated `svelte-docsmith/changelog` module, and the new `Changelog` component renders it. Because the entries come from the changelog you already ship, the page cannot fall behind what actually went out.

Commit hashes are stripped, multi-paragraph entries survive intact, and each entry's markdown is rendered to HTML at build time so your site needs no runtime markdown renderer. Release dates come from git, specifically the commit that first introduced each version's heading; no date is invented when the history isn't available. Point the new `changelog` option at the package you publish (`docsmith({ changelog: '../../packages/my-lib/CHANGELOG.md' })`) or set it to `false` to skip.

`generateFeed` builds an Atom feed from the same index, for a `changelog.xml/+server.ts` alongside the existing sitemap and llms.txt endpoints. Atom rather than RSS because it requires an unambiguous id and timestamp per entry, which a version and its release date give exactly.

A release that deserves more than a terse entry can have a hand-written page at `src/routes/changelog/<version>/`, which the generated entry then links to instead of to its anchor, so the ones worth writing up get a proper post while the rest stay generated.
