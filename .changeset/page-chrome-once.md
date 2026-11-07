---
'svelte-docsmith': patch
---

Resolve the page chrome once for both headers. The header links and which one is current, the archived-version banner, the feedback issue link and the canonical URL now come from the same resolved page view as the sidebar and breadcrumbs, and the desktop and mobile headers both read it. This fixes two places where the mobile header disagreed with the desktop one: its menu now marks the current section's link with `aria-current="page"`, and it shows `site.logo` instead of always falling back to the book icon. The feedback issue link also no longer doubles the slash when `site.github` ends in one.
