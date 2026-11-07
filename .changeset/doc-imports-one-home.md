---
'svelte-docsmith': patch
---

Give doc imports one home. `?source` and `?props` are each one module with a page side and an agent side, served by one Vite plugin, and props are read through one reader that owns the shared extractor, file watching and warning once. Two concurrent reads of one component now share one extraction, so its warnings can no longer be reported twice. No change to what pages, `llms-full.txt`, the `.md` twins or the MCP server serve: the docs site's prerendered output and client bundle are byte-for-byte the same.
