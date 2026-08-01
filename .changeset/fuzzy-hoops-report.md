---
'svelte-docsmith': minor
---

- Report the pages an archive copies that import across the freeze boundary, so `archive-version` says out loud when a frozen page will keep resolving to current code
- The notice names each page and the specifiers it crosses on (`$lib`, bare npm packages, relative paths that climb out of the docs root), and is informational: the archive is still written and the config block still printed
