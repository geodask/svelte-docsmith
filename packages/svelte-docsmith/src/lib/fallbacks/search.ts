/**
 * `svelte-docsmith/search` — the generated search index.
 *
 * At build time the `docsmith()` Vite plugin (in `vite.config.ts`) intercepts
 * this import and replaces it with your doc pages' plain-text bodies. This file
 * is only the fallback that runs when the plugin is missing — see
 * {@link missingPluginError}.
 */
import type { SearchDoc } from '$lib/core/content.js';
import { missingPluginError } from './missing-plugin.js';

export const docs: SearchDoc[] = [];

throw missingPluginError('search');
