---
'svelte-docsmith': patch
---

Stop the header showing a stray divider when search isn't wired. The separator between the search trigger and the header action icons rendered unconditionally, so a site that passed no `search` loader to `DocsShell` got a rule with nothing before it. It now appears only alongside the trigger it divides.
