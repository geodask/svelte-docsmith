<script lang="ts">
	import type { ChangelogRelease } from '$lib/core/changelog.js';

	const { release }: { release: ChangelogRelease } = $props();

	const formatted = $derived(
		release.date
			? new Date(release.date).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})
			: undefined
	);
</script>

<!-- The version is the anchor the feed links to, so it carries the id. -->
<section id={release.version} class="scroll-mt-24">
	<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
		<h2 class="text-2xl font-semibold tracking-tight">
			{#if release.path}
				<a href={release.path} class="hover:text-primary transition-colors">{release.version}</a>
			{:else}
				{release.version}
			{/if}
		</h2>
		{#if formatted}
			<time datetime={release.date} class="text-muted-foreground text-sm">{formatted}</time>
		{/if}
	</div>

	{#each release.groups as group (group.kind)}
		<h3 class="text-muted-foreground mt-6 text-xs font-semibold tracking-wide uppercase">
			{group.kind}
		</h3>
		<ul class="mt-3 space-y-4">
			{#each group.items as item (item)}
				<li class="border-border/70 border-l-2 pl-4">
					<!-- Rendered at build time from your own repository's changelog. -->
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div class="changelog-prose">{@html item}</div>
				</li>
			{/each}
		</ul>
	{/each}
</section>

<style>
	/* The entries arrive as HTML fragments rather than flowing through the
	   markdown layout's prose styles, so they need their own small set. */
	.changelog-prose :global(p) {
		margin: 0 0 0.75rem;
		line-height: 1.65;
	}
	.changelog-prose :global(p:last-child) {
		margin-bottom: 0;
	}
	.changelog-prose :global(code) {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.85em;
		padding: 0.05em 0.3em;
		border-radius: 0.3rem;
		background: color-mix(in oklch, var(--muted) 60%, transparent);
	}
	.changelog-prose :global(a) {
		color: var(--primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.changelog-prose :global(ul) {
		margin: 0.5rem 0 0.75rem;
		padding-left: 1.1rem;
		list-style: disc;
	}
	.changelog-prose :global(li) {
		margin: 0.25rem 0;
	}
	.changelog-prose :global(pre) {
		margin: 0.75rem 0;
		padding: 0.75rem 1rem;
		border-radius: var(--radius, 0.5rem);
		background: var(--muted);
		overflow-x: auto;
		font-size: 0.85em;
	}
	.changelog-prose :global(pre code) {
		background: none;
		padding: 0;
	}
</style>
