---
'svelte-docsmith': minor
---

Highlight code lines by number from the fence: ```` ```svelte {4} ````, with lists and ranges (`{1,5}`, `{2-4}`) too. This is the only way to mark a line inside a Svelte template region, where Shiki's comment markers cannot reach: an HTML comment there is stripped without highlighting anything, so the marker silently does nothing. Comment markers keep working everywhere they already did.

Header nav links now show which one is active. A link is matched on its section rather than its exact path, since a header link is usually the entry point to an area rather than a page you sit on: "Docs" pointing at `/docs/introduction` stays lit across all of `/docs/*`. External links are never marked, and a link to `/` matches only the root. The active link also carries `aria-current="page"`.
