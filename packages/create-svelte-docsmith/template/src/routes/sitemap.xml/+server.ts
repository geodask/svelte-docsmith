import { sitemap } from 'svelte-docsmith/server';

export const prerender = true;
export const GET = sitemap({ extra: [{ path: '/' }] });
