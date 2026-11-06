---
'svelte-docsmith': minor
---

Add `svelte-docsmith/server`, with ready route handlers for the files a docs site serves besides its pages: `sitemap`, `changelogFeed`, `llmsTxt`, `llmsFullTxt`, `agentMarkdown` (the `<path>.md` twins) and `mcpServer`. Each reads the generated indexes itself, keeps to the current version where that applies, and takes your `defineConfig` result, so a route is one line:

```ts
// src/routes/sitemap.xml/+server.ts
import { sitemap } from 'svelte-docsmith/server';
import { siteConfig } from '$lib/site-config';

export const prerender = true;
export const GET = sitemap(siteConfig, { extra: [{ path: '/' }] });
```

`svelte-docsmith/content` now also exports `content`, the pages and the version manifest together, and `DocsShell` and `ErrorPage` take it as their `content` prop (`<DocsShell {content}>`), so a page can no longer pass the pages without the versions. The bare `docs` array plus `versions` still works, and `versions` is deprecated. `svelte-docsmith/changelog` also exports `changelogPath`, so the feed links where the plugin dated the releases.

**Breaking:** `generateSitemap`, `generateFeed`, `generateLlmsTxt`, `generateLlmsFullTxt`, `currentOnly` and `mcpHandler`, along with the `LlmsSite`, `FeedSite` and `McpOptions` types, are no longer exported from `svelte-docsmith`. Replace each route with its handler from `svelte-docsmith/server`; see the SEO, Changelog and MCP server pages.
