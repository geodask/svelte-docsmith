import { llmsTxt } from 'svelte-docsmith/server';
import { siteConfig } from '#lib/site-config.ts';

export const prerender = true;
export const GET = llmsTxt(siteConfig);
