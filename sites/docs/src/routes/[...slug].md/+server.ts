import { agentMarkdown } from 'svelte-docsmith/server';

// Every page's agent markdown at `<path>.md`. `entries` lists every page so the
// twins prerender even if nothing links to them.
export const prerender = true;
export const { GET, entries } = agentMarkdown();
