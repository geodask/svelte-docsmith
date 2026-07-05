// The svelte-docsmith public API. Everything not exported here — the vendored
// shadcn primitives, the TOC engine, the clipboard helper, the markdown
// renderer map — is internal and may change between releases.

// Chrome
export { default as DocsShell } from './ui/layouts/docs-shell.svelte';
export { default as ThemeProvider } from './ui/theme-provider.svelte';
export { default as ThemeToggle } from './ui/theme-toggle.svelte';

// Docs components (authored inside markdown or composed in pages)
export { default as LiveExample } from './ui/live-example.svelte';
export { default as Tabs } from './ui/tabs.svelte';
export { default as TabItem } from './ui/tab-item.svelte';
export { default as Callout } from './ui/callout.svelte';
export { default as Steps } from './ui/steps.svelte';
export { default as Step } from './ui/step.svelte';
export { default as Card } from './ui/card.svelte';
export { default as CardGrid } from './ui/card-grid.svelte';
export { default as Accordion } from './ui/accordion.svelte';
export { default as AccordionItem } from './ui/accordion-item.svelte';
export { default as Badge, type BadgeVariant } from './ui/badge.svelte';
export { default as Kbd } from './ui/kbd.svelte';
export { default as FileTree } from './ui/file-tree.svelte';
export { default as FileTreeItem } from './ui/file-tree-item.svelte';
export { default as PropsTable } from './ui/props-table.svelte';
export { default as Prop } from './ui/prop.svelte';

// Config
export { defineConfig, type DocsmithConfig, type DocsContentItem } from './config.js';
