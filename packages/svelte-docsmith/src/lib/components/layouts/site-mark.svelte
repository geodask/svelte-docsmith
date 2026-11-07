<script lang="ts">
	import { site } from 'svelte-docsmith/site';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils/cn.js';

	const {
		logo,
		class: className
	}: {
		/** The shell's `logo` snippet, which wins over `site.logo`. */
		logo?: Snippet;
		/** Classes for the `site.logo` image or the built-in book mark (not the snippet). */
		class?: string;
	} = $props();
</script>

<!-- The site's logo mark, in one place so the desktop and mobile headers pick
     it the same way: the `logo` snippet, then `site.logo`, then a book icon. -->
{#if logo}
	{@render logo()}
{:else if site.logo}
	<img src={site.logo} alt="" class={cn('size-5 object-contain', className)} />
{:else}
	<BookOpenText class={cn('size-5', className)} />
{/if}
