---
'svelte-docsmith': minor
---

Add an announcement bar. Set `announcement` in your config (`{ text, tag?, href?, external?, id?, dismissible? }`) to show a thin bar above the header on every page, with an optional leading `tag` pill (e.g. `"New"`) carrying the accent color. It's dismissible by default and, once dismissed, stays dismissed (persisted in `localStorage`) until you change its `id` or `text`, so a new announcement shows again. A blocking head script keeps an already-dismissed bar from flashing in and shifting the layout on reload. The bar sits above the sticky header, so it scrolls away as the reader moves down the page.
