/**
 * `svelte-docsmith/llms` — the generated LLM content index.
 *
 * At build time the `docsmith()` Vite plugin (in `vite.config.ts`) intercepts
 * this import and replaces it with your doc pages' titles, sections, and full
 * markdown bodies. This file is only the fallback that runs when the plugin is
 * missing — see {@link missingPluginError}.
 */
import type { LlmsDoc } from '$lib/core/content.js';
import { missingPluginError } from './missing-plugin.js';

export const docs: LlmsDoc[] = [];

throw missingPluginError('llms');
