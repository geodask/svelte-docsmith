/**
 * `svelte-docsmith/server`: ready route handlers for the files a docs site
 * serves besides its pages. Each reads the site config and the generated indexes
 * itself and serves the current version only, so a route is one line:
 *
 * ```ts
 * // src/routes/sitemap.xml/+server.ts
 * import { sitemap } from 'svelte-docsmith/server';
 *
 * export const prerender = true;
 * export const GET = sitemap({ extra: [{ path: '/' }] });
 * ```
 *
 * Server-only, and only with the `docsmith()` Vite plugin, which serves the
 * site config and the indexes these read.
 */
import { content } from 'svelte-docsmith/content';
import { docs as llms } from 'svelte-docsmith/llms';
import { docs as search } from 'svelte-docsmith/search';
import { releases, changelogPath } from 'svelte-docsmith/changelog';
import { site } from 'svelte-docsmith/site';
import { routeHandlers, type FileHandler, type SitemapOptions } from '#lib/server/routes.js';

export type { FileHandler, SitemapOptions } from '#lib/server/routes.js';
export type { SitemapEntry } from '#lib/generate/sitemap.js';

const handlers = routeHandlers({ site, content, llms, search, releases, changelogPath });

/**
 * `sitemap.xml`: every docs page of the current version, with its last-updated
 * day, plus the `extra` pages you list. Links are absolute when the config has
 * `site.url`.
 */
export function sitemap(options?: SitemapOptions): FileHandler {
	return handlers.sitemap(options);
}

/**
 * `changelog.xml`: an Atom feed of your releases, linking to the changelog page
 * at `docsmith({ changelog: { path } })`.
 */
export function changelogFeed(): FileHandler {
	return handlers.changelogFeed();
}

/**
 * `llms.txt`: the site title and description, the MCP server when `site.mcp`
 * names one, and a link to every current page in reading order.
 */
export function llmsTxt(): FileHandler {
	return handlers.llmsTxt();
}

/** `llms-full.txt`: every current page's agent markdown, in reading order. */
export function llmsFullTxt(): FileHandler {
	return handlers.llmsFullTxt();
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
 * export const { GET, POST, OPTIONS } = mcpServer();
 * ```
 *
 * @experimental Outside the 1.0 stability promise. May change in a minor.
 */
export function mcpServer() {
	return handlers.mcpServer();
}
