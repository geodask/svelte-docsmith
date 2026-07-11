---
'svelte-docsmith': patch
---

Polish anchor navigation and copy resilience.

- **Mobile table of contents is now server-rendered.** The mobile TOC button and list are driven by the build-time heading index, so they're present on first paint (and without JavaScript) instead of popping in after hydration — matching the desktop TOC.
- **Heading anchor links are keyboard-accessible.** The `#` link on each `h2`/`h3` now reveals on focus (not just hover) and carries an accessible label, so it's reachable by keyboard and announced by screen readers.
- **Copying to the clipboard fails quietly.** The copy button no longer throws an unhandled rejection in insecure contexts or when clipboard permission is denied; it logs a warning and leaves the button in its normal state.
