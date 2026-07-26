---
'svelte-docsmith': minor
---

Add opt-in versioned docs (Docusaurus-style, every version prefixed).

- Declare `versions` in `docsmith()` to serve version-prefixed docs (`/docs/v2/…`), with the sidebar, search, prev/next, and breadcrumbs all scoped to the version being read. No `versions` means today's single-tree behaviour, unchanged.
- A header version switcher that keeps you on the same page across versions, and a banner warning when you're on an archived or unreleased version with a link to the current equivalent.
- Archived versions stay indexable with a self-canonical; a `prerelease` version gets `noindex`; `sitemap.xml` and `llms.txt` list the latest release only, via the new `latestOnly` helper. `latestLandingUrl` targets the bare `/docs` redirect.
- `svelte-docsmith cut-version <id>` snapshots the working `next` docs into a frozen version folder.
