/**
 * `svelte-docsmith/site` — the site config, the `site` options of `docsmith()`.
 *
 * At build time the `docsmith()` Vite plugin (in `vite.config.ts`) intercepts
 * this import and replaces it with your `site` options. This file is only the
 * fallback that runs when the plugin is missing.
 *
 * Unlike the other fallbacks it doesn't throw on import: `DocsShell` and
 * `ErrorPage` import it, and they sit in the main `svelte-docsmith` entry
 * beside components (`Callout`, `Tabs`, …) that work without the plugin. The
 * stand-in throws {@link missingPluginError} when it is read instead, which is
 * when a component that needs the config renders.
 *
 * `outside` is the resolved `links.outside` of `docsmith()`: the outside paths
 * the shell marks its site config links `rel="external"` under. Without the
 * plugin nothing is declared, so it is empty rather than a thrower, and a
 * component that only reads it (`AnnouncementBar`) still renders.
 */
import type { DocsmithSite } from '#lib/core/config.js';
import { missingPluginError } from './missing-plugin.js';

export const site: DocsmithSite = new Proxy({} as DocsmithSite, {
	get(_, key) {
		// Let `await`, string conversion and inspection probe it without throwing.
		if (typeof key === 'symbol' || key === 'then') return undefined;
		throw missingPluginError('site');
	}
});

export const outside: string[] = [];
