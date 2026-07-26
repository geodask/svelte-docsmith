---
'svelte-docsmith': patch
---

Accessibility polish across the docs chrome.

- Honour `prefers-reduced-motion`: overlay (dialog, sheet, popover, dropdown, accordion) and transition animations collapse to instant; opacity fades still play.
- The copy button announces "Copied to clipboard" to screen readers via a polite live region, instead of only swapping its icon.
- The header GitHub link sets `rel="noopener noreferrer"`.
