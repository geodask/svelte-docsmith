// Tier 1 — assembled experience
export { default as DocsShell } from './ui/layouts/docs-shell.svelte';
export { default as DocPage } from './ui/layouts/doc-page.svelte';
export { default as TableOfContents } from './ui/table-of-contents.svelte';
export { default as LiveExample } from './ui/live-example.svelte';
export { default as Tabs } from './ui/tabs.svelte';
export { default as TabItem } from './ui/tab-item.svelte';
export {
	navFromContent,
	type DocsmithConfig,
	type DocsContentItem,
	type NavGroup,
	type NavItem
} from './config.js';

// Markdown component map (for mdsvex layout wiring / per-component overrides)
export * as markdown from './ui/markdown/index.js';

// Tier 2 — parts for customizers
export * from './toc/index.js';
export { useClipboard } from './clipboard.svelte.js';
export {
	reactiveBreadcrumb,
	setupReactiveBreadcrumb,
	type BreadcrumbItem
} from './breadcrumb.svelte.js';

// Shared types
export type { WithChildren, WithChildrenOptional } from './types.js';
