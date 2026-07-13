---
'svelte-docsmith': minor
---

Add Mermaid diagram support. A ```` ```mermaid ```` code fence now renders as a diagram instead of highlighted code, themed to match the site — diagrams draw their colors, borders and text from your design tokens and follow the light/dark toggle. Diagrams render in the browser, and `mermaid` is an **optional peer dependency** pulled in only on pages that actually contain one — install it (`npm i -D mermaid`) to use diagrams; sites without them stay lean and need nothing. A `<pre>` source fallback shows if a diagram fails to parse or `mermaid` isn't installed.
