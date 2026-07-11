/**
 * `svelte-docsmith/llms` — the generated LLM content index.
 *
 * At build time the `docsmith()` Vite plugin (in `vite.config.ts`) intercepts
 * this import and replaces it with your doc pages' titles, sections, and full
 * markdown bodies. This file is only the fallback that runs when the plugin is
 * missing — it exists so the import type-checks and fails with a clear message
 * instead of a mystery.
 */
import type { LlmsDoc } from './config.js';

export const docs: LlmsDoc[] = [];

throw new Error(
	"[svelte-docsmith] 'svelte-docsmith/llms' requires the docsmith() plugin. " +
		"Add it to your vite.config: import { docsmith } from 'svelte-docsmith/vite'; " +
		'plugins: [docsmith(), tailwindcss(), sveltekit()]'
);
