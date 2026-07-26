---
'svelte-docsmith': minor
---

Add opt-in versioned docs. The current version stays unprefixed at your docs root, so turning versioning on never moves a URL.

- Declare `versions: { current, archived }` in `docsmith()`. The sidebar, search, prev/next, and breadcrumbs scope to the version being read. No `versions` means today's single-tree behaviour, unchanged.
- Archived versions are served at `/docs/<id>/…`, get a banner linking to the current equivalent, and drop their "Edit this page" link.
- A header version switcher appears once an archive exists, and keeps you on the same page across versions.
- Archives stay indexable with a self-canonical; `sitemap.xml` and `llms.txt` scope to the current version via the new `currentOnly` helper.
- `svelte-docsmith archive-version <id>` freezes the current docs into an archive, rewriting in-content links to stay inside it and preserving each page's real last-updated date.
- `DocsShell`'s `search` prop now receives the active version id, so a loader can return one version's records.
- `lastUpdated` frontmatter, when present, takes precedence over the git commit date.
