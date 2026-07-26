---
'svelte-docsmith': minor
---

Give the `archive-version` command one seam into the library, so version identity and commit dates are decided in one place instead of two.

- One `lastCommitDate`, shared by the command and the Vite plugin. Both now emit a commit day (`2026-03-04`); archived pages and current pages no longer carry different shapes in the same `lastUpdated` field.
- "Last updated" and changelog release dates render as a UTC calendar day, so they read the same in every timezone and match between the server render and hydration. They previously formatted in the ambient zone, which showed the wrong day west of UTC.
- Version ids are validated wherever they are declared, not only in the command. The rule covers `current` too, since archiving turns today's current id into an archive folder.
- A `versions` config that disagrees with your docs folder now fails the build, reporting the config to paste. Both mismatches were previously silent: an undeclared archive was merged into the current version, and a section folder declared as a version dropped out of the current sidebar.
- `.docsmith-archive` is now documented contract. A folder is an archived version when it carries the marker and is declared in `versions`; an archive copied by hand needs one.

Breaking, for sites already using `versions`. `DocsContentItem.lastUpdated` is a `YYYY-MM-DD` day rather than a full ISO timestamp, so a consumer reading time-of-day off it loses that; `sitemap.xml` already truncated to the day and is unaffected. The new checks can also fail a build that previously passed, which is the point: every case they reject was producing a wrong content index. Unversioned sites are unaffected.
