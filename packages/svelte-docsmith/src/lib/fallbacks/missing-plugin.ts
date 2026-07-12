/**
 * Shared error for the virtual-module fallbacks (`content`, `search`, `llms`).
 * Each of those modules is replaced at build time by the `docsmith()` Vite
 * plugin; the checked-in file only runs when the plugin is missing, so it
 * throws this clear, actionable message instead of surfacing an empty index.
 */
export function missingPluginError(subpath: string): Error {
	return new Error(
		`[svelte-docsmith] 'svelte-docsmith/${subpath}' requires the docsmith() plugin. ` +
			"Add it to your vite.config: import { docsmith } from 'svelte-docsmith/vite'; " +
			'plugins: [docsmith(), tailwindcss(), sveltekit()]'
	);
}
