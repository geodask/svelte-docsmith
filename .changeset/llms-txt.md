---
'svelte-docsmith': minor
---

Add llms.txt support. The `docsmith()` plugin now emits a `svelte-docsmith/llms` module with each page's full markdown, and two framework-agnostic helpers, `generateLlmsTxt` and `generateLlmsFullTxt`, turn it into the `llms.txt` index and `llms-full.txt` corpus defined by the llmstxt.org standard. Both follow the sidebar reading order (grouped by `section`, sorted by `order`). Wire them into `src/routes/llms.txt/+server.ts` and `src/routes/llms-full.txt/+server.ts`. See the SEO docs page.
