---
'svelte-docsmith': minor
---

Make Darkmatter the built-in default theme. `svelte-docsmith/theme.css` now ships the Darkmatter tokens as its base, so importing it alone gives the Darkmatter look (near-monochrome with a warm orange primary) without importing a preset. Sites that want the previous look can import `svelte-docsmith/themes/tangerine.css` after `theme.css`.

Also fixes Darkmatter's dark-mode `destructive` token, which was a teal carried over from the source preset instead of a red, so delete buttons and error surfaces now read as errors in dark mode.
