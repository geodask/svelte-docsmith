import { docs } from 'svelte-docsmith/llms';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

// Enumerate every page so the `.md` twins prerender even if nothing links to them.
export const entries: EntryGenerator = () =>
	docs.map((doc) => ({ slug: doc.path.replace(/^\//, '') }));

export const GET: RequestHandler = ({ params }) => {
	const doc = docs.find((d) => d.path === `/${params.slug}`);
	if (!doc) error(404, 'Not found');
	return new Response(doc.content, {
		headers: { 'content-type': 'text/markdown; charset=utf-8' }
	});
};
