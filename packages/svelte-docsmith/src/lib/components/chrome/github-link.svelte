<script lang="ts">
	import { Button } from '#lib/components/shadcn/button/index.js';
	import GithubIcon from '#lib/components/icons/github.svelte';
	import StarIcon from '@lucide/svelte/icons/star';
	import { githubStars, site } from 'svelte-docsmith/site';
	import { formatStars } from '#lib/core/github-stars.js';
	import { cn } from '#lib/utils/cn.js';
	import { browserStars, loadBrowserStars } from './github-stars.svelte.js';

	const {
		countClass
	}: {
		/** Classes for the visible count, e.g. to hide it where the header is tight. */
		countClass?: string;
	} = $props();

	// The build bakes the count in when it can. When it couldn't, the reader's
	// browser asks GitHub itself, unless the author turned the count off.
	const fallback =
		githubStars === undefined && site.githubStars !== false ? site.github : undefined;

	$effect(() => {
		if (fallback) loadBrowserStars(fallback);
	});

	const count = $derived(githubStars ?? (fallback ? browserStars(fallback) : undefined));
	const stars = $derived(count === undefined ? undefined : formatStars(count));
</script>

{#if site.github}
	<Button
		size={stars ? 'sm' : 'icon'}
		variant="ghost"
		target="_blank"
		rel="noopener noreferrer"
		href={site.github}
		title={stars ? `${stars.full} stars on GitHub` : undefined}
		aria-label={stars ? `GitHub, ${stars.full} stars` : 'GitHub'}
		class={cn('text-muted-foreground hover:text-foreground h-8', stars ? 'gap-1.5 px-2' : 'size-8')}
	>
		<GithubIcon class="size-4" />
		{#if stars}
			<span class={cn('flex items-center gap-1 text-xs tabular-nums', countClass)}>
				<StarIcon class="size-3" />
				{stars.short}
			</span>
		{/if}
	</Button>
{/if}
