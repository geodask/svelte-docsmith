---
'svelte-docsmith': minor
---

Add reading time and a page-feedback widget to `DocsShell`.

Doc pages now show an estimated reading time (computed at build time from the page's word count, in the content index as `readingTime`); toggle it with the `readingTime` prop (default `true`). The new `feedback` prop renders a "Was this page helpful?" thumbs up/down widget at the foot of each page: pass `true` for the UI alone, or a `(vote, path) => void` callback to record votes.
