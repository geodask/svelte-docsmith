<script lang="ts" module>
	// mdsvex maps markdown elements to this module's exports (the export names
	// must match the tag names). `docsmith()` injects this file as the default
	// layout for every compiled markdown page.
	import * as markdown from './ui/markdown/index.js';
	export const pre = markdown.pre;
	export const code = markdown.code;
	export const h2 = markdown.h2;
	export const h3 = markdown.h3;
	export const table = markdown.table;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	// mdsvex passes each frontmatter field to the layout as a prop, so the page's
	// `<h1>` (and lead subtitle) come from `title`/`description` — authored once in
	// frontmatter, never repeated in the body. Pages start their content at `##`.
	const {
		title,
		description,
		children
	}: { title?: string; description?: string; children: Snippet } = $props();
</script>

<article class="prose prose-base dark:prose-invert max-w-none pb-16">
	{#if title}
		<h1>{title}</h1>
	{/if}
	{#if description}
		<p class="lead">{description}</p>
	{/if}
	{@render children()}
</article>
