import { changelogFeed } from 'svelte-docsmith/server';

export const prerender = true;
export const GET = changelogFeed();
