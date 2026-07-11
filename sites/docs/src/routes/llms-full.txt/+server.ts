import { docs } from 'svelte-docsmith/llms';
import { generateLlmsFullTxt } from 'svelte-docsmith';
import { siteConfig } from '$lib/site-config';

export const prerender = true;

export function GET() {
	const body = generateLlmsFullTxt(
		{ title: siteConfig.title, description: siteConfig.description, origin: siteConfig.url },
		docs
	);
	return new Response(body, {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
}
