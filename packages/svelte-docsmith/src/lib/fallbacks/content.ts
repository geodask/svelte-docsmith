/**
 * `svelte-docsmith/content` — the generated sidebar content index.
 *
 * At build time the `docsmith()` Vite plugin (in `vite.config.ts`) intercepts
 * this import and replaces it with your doc pages' frontmatter. This file is
 * only the fallback that runs when the plugin is missing — see
 * {@link missingPluginError}.
 */
import type { DocsContentItem } from '$lib/core/content.js';
import { missingPluginError } from './missing-plugin.js';

export const docs: DocsContentItem[] = [];

throw missingPluginError('content');
