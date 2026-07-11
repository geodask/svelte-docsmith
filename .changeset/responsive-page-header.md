---
'svelte-docsmith': patch
---

Fix the `page` layout header on mobile. `DocsShell layout="page"` (landing pages, the themes gallery, any non-doc page) previously rendered the full desktop header at every breakpoint, so on phones the nav links, version badge, and controls crammed together with no menu — and it sat at a different horizontal inset than the docs pages.

Both layouts now share one header system: `DocsHeader` on desktop and the responsive mobile header below `lg`, so every page's header lines up and collapses to a hamburger identically. The mobile menu now also lists the configured header nav (`config.nav`) alongside the doc sidebar, so links like a top-level "Themes" are reachable from the mobile menu on doc pages too.
