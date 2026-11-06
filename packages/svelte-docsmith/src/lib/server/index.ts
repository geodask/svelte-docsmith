/**
 * `svelte-docsmith/server`: ready route handlers for the files a docs site
 * serves besides its pages. Each reads the generated indexes itself and serves
 * the current version only, so a route is one line over your site config:
 *
 * ```ts
 * // src/routes/sitemap.xml/+server.ts
 * import { sitemap } from 'svelte-docsmith/server';
 * import { siteConfig } from '$lib/site-config';
 *
 * export const prerender = true;
 * export const GET = sitemap(siteConfig, { extra: [{ path: '/' }] });
 * ```
 *
 * Server-only, and only with the `docsmith()` Vite plugin, which serves the
 * indexes these read.
 */
import { content } from 'svelte-docsmith/content';
import { docs as llms } from 'svelte-docsmith/llms';
import { docs as search } from 'svelte-docsmith/search';
import { releases, changelogPath } from 'svelte-docsmith/changelog';
import {
	routeHandlers,
	type FileHandler,
	type RouteSite,
	type SitemapOptions
} from '#lib/server/routes.js';

export type { FileHandler, RouteSite, SitemapOptions } from '#lib/server/routes.js';
export type { SitemapEntry } from '#lib/generate/sitemap.js';

const handlers = routeHandlers({ content, llms, search, releases, changelogPath });

/**
 * `sitemap.xml`: every docs page of the current version, with its last-updated
 * day, plus the `extra` pages you list. Links are absolute when the config has
 * a `url`.
 */
export function sitemap(site: RouteSite, options?: SitemapOptions): FileHandler {
	return handlers.sitemap(site, options);
}

/**
 * `changelog.xml`: an Atom feed of your releases, linking to the changelog page
 * at the plugin's `changelogPath`.
 */
export function changelogFeed(site: RouteSite): FileHandler {
	return handlers.changelogFeed(site);
}

/**
 * `llms.txt`: the site title and description, the MCP server when the config
 * names one, and a link to every current page in reading order.
 */
export function llmsTxt(site: RouteSite): FileHandler {
	return handlers.llmsTxt(site);
}

/** `llms-full.txt`: every current page's agent markdown, in reading order. */
export function llmsFullTxt(site: RouteSite): FileHandler {
	return handlers.llmsFullTxt(site);
}

/**
 * The `<path>.md` twin of every page (all versions), as agent markdown, for
 * `src/routes/[...slug].md/+server.ts`. Export both: `entries` lists every page
 * so the twins prerender.
 *
 * ```ts
 * export const prerender = true;
 * export const { GET, entries } = agentMarkdown();
 * ```
 */
export function agentMarkdown() {
	return handlers.agentMarkdown();
}

/**
 * The MCP server, for `src/routes/mcp/+server.ts`. It needs a server runtime,
 * so opt the route out of prerendering.
 *
 * ```ts
 * export const prerender = false;
 * export const { GET, POST, OPTIONS } = mcpServer(siteConfig);
 * ```
 *
 * @experimental Outside the 1.0 stability promise. May change in a minor.
 */
export function mcpServer(site: RouteSite) {
	return handlers.mcpServer(site);
}
