<script lang="ts" module>
	// mdsvex maps markdown elements to this module's exports (the export names
	// must match the tag names). `docsmith()` injects this file as the default
	// layout for every compiled markdown page.
	import * as markdown from './ui/markdown/index.js';
	export const pre = markdown.pre;
	export const code = markdown.code;
	export const h2 = markdown.h2;
	export const h3 = markdown.h3;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<article class="prose prose-base dark:prose-invert max-w-none pb-16">
	{@render children()}
</article>
