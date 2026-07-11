/**
 * `svelte-docsmith/search` — the generated search index.
 *
 * At build time the `docsmith()` Vite plugin (in `vite.config.ts`) intercepts
 * this import and replaces it with your doc pages' plain-text bodies. This file
 * is only the fallback that runs when the plugin is missing — it exists so the
 * import type-checks and fails with a clear message instead of a mystery.
 */
import type { SearchDoc } from './config.js';

export const docs: SearchDoc[] = [];

throw new Error(
	"[svelte-docsmith] 'svelte-docsmith/search' requires the docsmith() plugin. " +
		"Add it to your vite.config: import { docsmith } from 'svelte-docsmith/vite'; " +
		'plugins: [docsmith(), tailwindcss(), sveltekit()]'
);
