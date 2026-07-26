---
'svelte-docsmith': patch
---

- Fenced code is detected per CommonMark everywhere at build time: a fence now closes only on a marker of the same character, at least as long as the opener, carrying no info string. A page whose samples nest one fence inside another (` ```svelte ` inside ` ```` `) no longer leaks its code into the search index or phantom headings into the table of contents.
- The fence rule and the frontmatter delimiters live in one module the search index, table of contents, `llms.txt` content and the archive rewriter all cross, instead of a copy per pass.
