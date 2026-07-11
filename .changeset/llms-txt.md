---
'svelte-docsmith': minor
---

Add llms.txt and "Copy page" support for AI tooling.

The `docsmith()` plugin now emits a `svelte-docsmith/llms` module with each page's full markdown. Two framework-agnostic helpers, `generateLlmsTxt` and `generateLlmsFullTxt`, turn it into the `llms.txt` index and `llms-full.txt` corpus defined by the llmstxt.org standard, both following the sidebar reading order (grouped by `section`, sorted by `order`). Wire them into `src/routes/llms.txt/+server.ts` and `src/routes/llms-full.txt/+server.ts`.

A new `copyPage` prop on `DocsShell` adds a "Copy page" split button to doc pages: copy the page as Markdown, view the raw `.md`, or open it in ChatGPT / Claude. Back it with a catch-all `src/routes/[...slug].md/+server.ts` over the same `svelte-docsmith/llms` index. See the SEO docs page.
