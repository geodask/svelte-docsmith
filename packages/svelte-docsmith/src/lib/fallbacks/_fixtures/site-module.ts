/**
 * A whole `svelte-docsmith/site` module for a test that renders something
 * reading it. Typed by the fallback, so an export added there arrives here,
 * and no test has to list the exports it doesn't care about:
 *
 * ```ts
 * vi.mock('svelte-docsmith/site', async () =>
 * 	(await import('#lib/fallbacks/_fixtures/site-module.js')).siteModule({ site })
 * );
 * ```
 */
import { DEFAULT_OG_COLOURS } from '#lib/server/og/colours.js';

type SiteModule = typeof import('../site.js');

export function siteModule(exports: Partial<SiteModule> = {}): SiteModule {
	return {
		site: { title: 'My Docs' },
		outside: [],
		githubStars: undefined,
		ogColours: DEFAULT_OG_COLOURS,
		...exports
	};
}
