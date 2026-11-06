import { docs } from 'svelte-docsmith/llms';
import { versions } from 'svelte-docsmith/content';
import { generateLlmsTxt, currentOnly } from 'svelte-docsmith';
import { siteConfig } from '#lib/site-config.ts';

export const prerender = true;

export function GET() {
	const body = generateLlmsTxt(
		{
			title: siteConfig.title,
			description: siteConfig.description,
			origin: siteConfig.url,
			mcp: siteConfig.mcp
		},
		currentOnly(docs, versions)
	);
	return new Response(body, {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
}
