import { docs, versions } from 'svelte-docsmith/content';
import { generateSitemap, currentOnly } from 'svelte-docsmith';
import { siteConfig } from '$lib/site-config';

export const prerender = true;

export function GET() {
	const body = generateSitemap(siteConfig.url ?? '', [
		{ path: '/' },
		{ path: '/themes' },
		...currentOnly(docs, versions).map((d) => ({ path: d.path, lastmod: d.lastUpdated }))
	]);
	return new Response(body, {
		headers: { 'content-type': 'application/xml' }
	});
}
