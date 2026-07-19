---
'svelte-docsmith': minor
---

Add filenames and line numbers to code blocks. A fence's metadata now drives both: ```` ```ts title="vite.config.ts" ```` puts a filename bar above the block, and `showLineNumbers` adds a gutter. Pair `startLine=12` with numbering when the snippet is lifted out of a longer file so the numbers match the real source.

Number every block by default with the new `lineNumbers` preprocessor option; an individual fence still opts out with `noLineNumbers`. The numbers are a CSS counter over Shiki's existing per-line spans, so they add no markup and stay out of what the copy button copies. When a block has a title, the copy button moves into the filename bar instead of floating over the first line of code.
