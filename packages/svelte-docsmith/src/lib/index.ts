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

// Generated props tables (experimental — outside the 1.0 stability promise).
// A props import (`import props from './button.svelte?props'`, served by the
// `docsmith()` vite plugin) yields `ExtractedProps` for `<PropsTable of={props}>`.
// The shape is internal to `PropsTable` and may change in a minor.
export type { ExtractedProps } from './core/extracted-props.js';
// What a props playground (`<LiveExample controls={props}>`) passes to its
// `children` snippet and takes as `args` (experimental, like the above).
export type { PlaygroundValues } from './core/playground.js';

// Landing page sections (for the marketing page in front of your docs)
export { default as Hero } from './components/landing/hero.svelte';
export { default as FeatureGrid } from './components/landing/feature-grid.svelte';
export { default as Feature } from './components/landing/feature.svelte';
export { default as CTA } from './components/landing/cta.svelte';
export { default as Action } from './components/landing/action.svelte';

// Config
export {
	type DocsmithSite,
	type DocsContent,
	type DocsContentItem,
	type DocsCustomFields,
	type SearchDoc,
	type LlmsDoc
} from './core/index.js';

// Versioned docs (experimental — outside the 1.0 stability promise). Declare
// `versions` in the `docsmith()` vite plugin; the resolved manifest travels in
// the `content` export of `svelte-docsmith/content`, which `DocsShell` takes
// whole. The route handlers in `svelte-docsmith/server` keep sitemap.xml and
// llms.txt to the current version. An archive freezes content, not
// dependencies.
export type { DocsVersion, DocsVersions, ResolvedVersion } from './core/index.js';

// Search engine (framework-agnostic; for building a custom search UI over the
// generated `svelte-docsmith/search` index)
export {
	createSearchEngine,
	type SearchEngine,
	type SearchResult
} from './search/create-search.js';

// Changelog page (the generated `svelte-docsmith/changelog` index). Its feed,
// the sitemap, llms.txt, llms-full.txt, the `.md` page twins and the MCP server
// are route handlers in `svelte-docsmith/server`.
export { default as Changelog } from './components/changelog/changelog.svelte';
export type { ChangelogRelease, ChangelogGroup } from './core/changelog.js';
