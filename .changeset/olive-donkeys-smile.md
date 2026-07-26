---
'svelte-docsmith': patch
---

- Date every page from one git history walk instead of a `git log` per page, cutting the content index's git cost by about 11x (93ms to 8.5ms on a 23-page site) and scaling with history rather than page count
- Reuse that walk for the life of the dev server, so editing a page no longer re-runs git at all; dates now refresh on restart rather than on save
- Report a failed date lookup instead of silently dating only some pages, which a large repo could hit when the walk outgrew the default output buffer
- Freeze archived pages' dates from the same walk, so `archive-version` no longer spawns git per copied page
