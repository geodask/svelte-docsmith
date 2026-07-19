import { releases } from 'svelte-docsmith/changelog';
import { generateFeed } from 'svelte-docsmith';
import { siteConfig } from '$lib/site-config';

export const prerender = true;

export function GET() {
	const body = generateFeed(releases, {
		url: siteConfig.url ?? 'https://docsmith.geodask.com',
		title: siteConfig.title,
		description: siteConfig.description
	});
	return new Response(body, {
		headers: { 'content-type': 'application/atom+xml; charset=utf-8' }
	});
}
