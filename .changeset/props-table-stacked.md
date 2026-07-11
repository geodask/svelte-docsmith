---
'svelte-docsmith': patch
---

Fix `PropsTable` overflow on narrow content. The four-column table forced a horizontal scrollbar and crushed the Description column to a sliver whenever a prop had a long type signature (e.g. `() => Promise<SearchDoc[]>`). Each prop now renders as a stacked row — name, required badge, type chips, and default on one wrapping line, with the description full-width below — so nothing overflows and the description stays readable at every width. The `PropsTable` / `Prop` API is unchanged.
