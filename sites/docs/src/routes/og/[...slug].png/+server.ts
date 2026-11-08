import { ogImages } from 'svelte-docsmith/server';

// Every doc page's OG image at `/og/<path>.png`, drawn at build time. `entries`
// lists every page, because nothing links to the images but a meta tag.
export const prerender = true;
export const { GET, entries } = ogImages();
