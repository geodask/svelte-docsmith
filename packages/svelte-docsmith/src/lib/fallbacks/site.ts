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
 *
 * `githubStars` is the star count of the repo `site.github` points at, fetched
 * by the plugin at build time: `undefined` when there is no count to show
 * (no plugin, no github.com repo, `site.githubStars: false`, or a failed fetch).
 *
 * `ogColours` are the theme colours OG images are drawn in, read from the theme
 * file by the plugin. Without it, the default preset's.
 */
import type { DocsmithSite } from '#lib/core/config.js';
import type { OutsidePaths } from '#lib/core/outside-path.js';
import { missingPluginError } from './missing-plugin.js';
import { DEFAULT_OG_COLOURS, type OgColours } from '#lib/server/og/colours.js';

export const site: DocsmithSite = new Proxy({} as DocsmithSite, {
	get(_, key) {
		// Let `await`, string conversion and inspection probe it without throwing.
		if (typeof key === 'symbol' || key === 'then') return undefined;
		throw missingPluginError('site');
	}
});

export const outside: OutsidePaths = [];

export const githubStars: number | undefined = undefined;

export const ogColours: OgColours = DEFAULT_OG_COLOURS;
