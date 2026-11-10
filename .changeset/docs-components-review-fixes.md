---
'svelte-docsmith': patch
---

Fixes for images, install blocks and math. With math on, Svelte store reads like `{$a} and {$b}` are no longer read as a formula, a heading with a formula gets the same anchor the table of contents links to, and search keeps the text of inline code that holds a `$`. An image file whose name has spaces or non-ASCII characters is found next to the page, and an image inside a link no longer zooms, so clicking it follows the link. Install blocks are written out for agents in pages with CRLF line endings, and a `pkg` inside a fence's quoted title is left in the title.
