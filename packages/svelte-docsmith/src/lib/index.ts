// The svelte-docsmith public API. Everything not exported here — the vendored
// shadcn primitives, the TOC engine, the clipboard helper, the markdown
// renderer map — is internal and may change between releases.

// Chrome (site shell and theming)
export { default as DocsShell } from './components/layouts/docs-shell.svelte';
export { default as ErrorPage } from './components/layouts/error-page.svelte';
export { default as ThemeProvider } from './components/chrome/theme-provider.svelte';
export { default as ThemeToggle } from './components/chrome/theme-toggle.svelte';

// Docs components (authored inside markdown or composed in pages)
export { default as LiveExample } from './components/docs/live-example.svelte';
export { default as Tabs } from './components/docs/tabs.svelte';
export { default as TabItem } from './components/docs/tab-item.svelte';
export { default as Callout, type CalloutVariant } from './components/docs/callout.svelte';
export { default as Steps } from './components/docs/steps.svelte';
export { default as Step } from './components/docs/step.svelte';
export { default as Card } from './components/docs/card.svelte';
export { default as CardGrid } from './components/docs/card-grid.svelte';
export { default as Accordion } from './components/docs/accordion.svelte';
export { default as AccordionItem } from './components/docs/accordion-item.svelte';
export { default as Badge, type BadgeVariant } from './components/docs/badge.svelte';
export { default as Kbd } from './components/docs/kbd.svelte';
export { default as FileTree } from './components/docs/file-tree.svelte';
export { default as FileTreeItem } from './components/docs/file-tree-item.svelte';
export { default as PropsTable } from './components/docs/props-table.svelte';
export { default as Prop } from './components/docs/prop.svelte';

// Config
export {
	defineConfig,
	type DocsmithConfig,
	type DocsContentItem,
	type SearchDoc,
	type LlmsDoc
} from './core/index.js';

// Search engine (framework-agnostic; for building a custom search UI over the
// generated `svelte-docsmith/search` index)
export {
	createSearchEngine,
	type SearchEngine,
	type SearchResult
} from './search/create-search.js';

// Sitemap (framework-agnostic; wire into a `sitemap.xml/+server.ts`)
export { generateSitemap, type SitemapEntry } from './generate/sitemap.js';

// llms.txt (framework-agnostic; wire into `llms.txt/+server.ts` and
// `llms-full.txt/+server.ts` over the generated `svelte-docsmith/llms` index)
export { generateLlmsTxt, generateLlmsFullTxt, type LlmsSite } from './generate/llms.js';
