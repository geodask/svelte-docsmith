import { docs } from 'svelte-docsmith/llms';
import { docs as search } from 'svelte-docsmith/search';
import { versions } from 'svelte-docsmith/content';
import { mcpHandler } from 'svelte-docsmith';
import { siteConfig } from '#lib/site-config.ts';

// The MCP server answers each request at runtime, so it can't be prerendered.
export const prerender = false;

export const POST = mcpHandler({
	site: { title: siteConfig.title, description: siteConfig.description, origin: siteConfig.url },
	docs,
	search,
	versions
});

// The same handler answers the CORS preflight and, for a browser, a note on
// adding the server to an editor.
export { POST as GET, POST as OPTIONS };
