---
'svelte-docsmith': minor
---

Add an announcement bar. Set `announcement` in your config (`{ text, href?, external?, id?, dismissible? }`) to show a thin, brand-tinted bar above the header on every page. It's dismissible by default and, once dismissed, stays dismissed (persisted in `localStorage`) until you change its `id` or `text`, so a new announcement shows again. The bar sits above the sticky header, so it scrolls away as the reader moves down the page.
