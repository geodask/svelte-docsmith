---
'svelte-docsmith': patch
---

Move the search palette's state into one search session, separate from the dialog. No API change; `DocsShell`'s `search` loader works as before. Three behavior fixes come with it:

- A search loader that keeps failing no longer retries in a tight loop while the palette is open. It shows "Search is unavailable" and tries again the next time the palette opens.
- After a version switch, the palette never shows the previous version's results or suggestions while the new version's index loads, and a load that finishes after the reader has moved on is dropped.
- A loader that returns every version's records (like the default `svelte-docsmith/search` export) now builds an index over the active version only, instead of indexing every version and filtering the hits.
