<script lang="ts">
	import { Button } from '#lib/components/shadcn/button/index.js';
	import GithubIcon from '#lib/components/icons/github.svelte';
	import StarIcon from '@lucide/svelte/icons/star';
	import { githubStars, site } from 'svelte-docsmith/site';
	import { formatStars } from '#lib/core/github-stars.js';
	import { cn } from '#lib/utils/cn.js';

	const {
		countClass
	}: {
		/** Classes for the visible count, e.g. to hide it where the header is tight. */
		countClass?: string;
	} = $props();

	// Fetched once at build time by the plugin, so this is a constant per build.
	const stars = githubStars === undefined ? undefined : formatStars(githubStars);
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
