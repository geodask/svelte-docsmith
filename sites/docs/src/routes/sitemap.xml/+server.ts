import { docs } from 'svelte-docsmith/content';
import { generateSitemap } from 'svelte-docsmith';
import { siteConfig } from '$lib/site-config';

export const prerender = true;

export function GET() {
	const body = generateSitemap(siteConfig.url ?? '', [
		{ path: '/' },
		{ path: '/themes' },
		...docs.map((d) => ({ path: d.path, lastmod: d.lastUpdated }))
	]);
	return new Response(body, {
		headers: { 'content-type': 'application/xml' }
	});
}
