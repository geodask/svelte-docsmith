import { docs } from 'svelte-docsmith/llms';
import { generateLlmsTxt } from 'svelte-docsmith';
import { siteConfig } from '$lib/site-config';

export const prerender = true;

export function GET() {
	const body = generateLlmsTxt(
		{ title: siteConfig.title, description: siteConfig.description, origin: siteConfig.url },
		docs
	);
	return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
