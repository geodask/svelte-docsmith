---
'svelte-docsmith': minor
---

`llms.txt`, `llms-full.txt` and the MCP server's `list_pages` now follow the sidebar's reading order exactly. Pages that share an `order` sort by title instead of by path, a nested section's heading (`Guides / Advanced`) comes right after its parent's, blank section segments are ignored, and `llms-full.txt` reads in the same page order as the sidebar. `LlmsDoc.section` is now the section as written (`string | string[]`), the same as `DocsContentItem.section`, instead of a path joined with `/`.
