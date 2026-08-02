---
'svelte-docsmith': patch
---

Refine docs chrome edges and ship the full typeface stack:

- Self-host JetBrains Mono from `theme.css` so code faces match without a separate Google Fonts link
- Theme toggle labels the destination mode (`Switch to light/dark mode`)
- Search empty state lists suggested starter pages once the index loads
- Prev/next cards get directional chevrons and a light primary hover fill
- Mobile header includes the GitHub control when configured
- Background pattern grid lines follow the `--border` token so presets stay coherent
- Sidebar hover is quieter than the active state on dense trees
