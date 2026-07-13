---
'svelte-docsmith': minor
---

Add synced tab groups. Give related `<Tabs>` a `syncKey` and they share one selection: choosing (say) `pnpm` in any block selects it in every block with the same key, and the choice is remembered across reloads and navigation via `localStorage`. Ideal for package-manager, runtime, or OS variant blocks that a reader picks once. Tabs without a `syncKey` are unchanged, and the server still renders the default tab so there's no hydration flash.
