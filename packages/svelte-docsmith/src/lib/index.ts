// The svelte-docsmith public API. Everything not exported here — the vendored
// shadcn primitives, the TOC engine, the clipboard helper, the markdown
// renderer map — is internal and may change between releases.

export { default as DocsShell } from './ui/layouts/docs-shell.svelte';
export { default as LiveExample } from './ui/live-example.svelte';
export { default as Tabs } from './ui/tabs.svelte';
export { default as TabItem } from './ui/tab-item.svelte';
export { defineConfig, type DocsmithConfig, type DocsContentItem } from './config.js';
