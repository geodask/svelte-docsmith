<script lang="ts">
	import type { ChangelogRelease } from '$lib/core/changelog.js';
	import ChangelogEntry from './changelog-entry.svelte';

	const {
		releases,
		title = 'Changelog',
		description,
		feed = '/changelog.xml'
	}: {
		/** Releases from the generated `svelte-docsmith/changelog` index. */
		releases: ChangelogRelease[];
		/** Page heading. */
		title?: string;
		/** Line below the heading. */
		description?: string;
		/** Path to the Atom feed, or `false` to hide the subscribe link. */
		feed?: string | false;
	} = $props();
</script>

<div class="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:py-20">
	<header class="mb-12">
		<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
		{#if description}
			<p class="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">{description}</p>
		{/if}
		{#if feed}
			<a
				href={feed}
				class="text-muted-foreground hover:text-foreground mt-4 inline-flex items-center gap-2 text-sm transition-colors"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" class="size-3.5" aria-hidden="true">
					<path
						d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M6 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
				Subscribe via Atom
			</a>
		{/if}
	</header>

	{#if releases.length === 0}
		<p class="text-muted-foreground">No releases yet.</p>
	{:else}
		<div class="space-y-14">
			{#each releases as release (release.version)}
				<ChangelogEntry {release} />
			{/each}
		</div>
	{/if}
</div>
