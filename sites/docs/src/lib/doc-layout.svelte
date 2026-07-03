<script lang="ts" module>
	// mdsvex replaces markdown elements with these components (the exports must
	// be named after the tags). They come from svelte-docsmith so the docs site
	// dogfoods the library's markdown renderers, incl. the Shiki-aware <pre>.
	import { markdown } from 'svelte-docsmith';
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
