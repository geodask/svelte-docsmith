<script lang="ts">
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import {
		mapPathToVersion,
		scopeContent,
		type ResolvedVersion,
		type DocsContentItem
	} from '$lib/core/index.js';

	// Rendered by DocsShell only when the active version is not the latest, to warn
	// a reader who landed on an old or unreleased page (usually from a search
	// engine) and give them a one-click path to the current equivalent. A real
	// <a> (not client nav) so it works without JS and stays crawlable.
	const {
		active,
		latest,
		pathname,
		content
	}: {
		active: ResolvedVersion;
		latest: ResolvedVersion;
		pathname: string;
		content: DocsContentItem[];
	} = $props();

	const latestHref = $derived(
		mapPathToVersion(
			pathname,
			active,
			latest,
			scopeContent(content, latest.id).map((c) => c.path)
		)
	);
</script>

<div class="docsmith-version-banner" class:is-prerelease={active.prerelease} role="note">
	{#if active.prerelease}
		<FlaskConical class="banner-icon" size={18} aria-hidden="true" />
		<p>
			You're reading the unreleased <strong>{active.label}</strong> docs.
			<a href={latestHref}>View the latest stable ({latest.label}) <ArrowRight size={14} /></a>
		</p>
	{:else}
		<TriangleAlert class="banner-icon" size={18} aria-hidden="true" />
		<p>
			You're reading the <strong>{active.label}</strong> docs. The latest version is
			<strong>{latest.label}</strong>.
			<a href={latestHref}>View this page in {latest.label} <ArrowRight size={14} /></a>
		</p>
	{/if}
</div>

<style>
	.docsmith-version-banner {
		display: flex;
		gap: 0.6rem;
		align-items: flex-start;
		margin-bottom: 1.75rem;
		padding: 0.75rem 1rem;
		border: 1px solid;
		border-radius: var(--radius);
		font-size: 0.9rem;
		line-height: 1.5;
		/* Archived (default): amber, "this is old". */
		color: var(--foreground);
		border-color: oklch(0.62 0.14 75 / 0.3);
		background: oklch(0.62 0.14 75 / 0.1);
	}
	/* Unreleased: primary tint, "this is ahead of the release". */
	.docsmith-version-banner.is-prerelease {
		border-color: color-mix(in oklch, var(--primary) 30%, transparent);
		background: color-mix(in oklch, var(--primary) 8%, transparent);
	}
	:global(.docsmith-version-banner .banner-icon) {
		margin-top: 0.1rem;
		flex-shrink: 0;
		color: oklch(0.62 0.14 75);
	}
	:global(.dark) .docsmith-version-banner :global(.banner-icon) {
		color: oklch(0.82 0.13 80);
	}
	:global(.docsmith-version-banner.is-prerelease .banner-icon) {
		color: var(--primary);
	}
	.docsmith-version-banner p {
		margin: 0;
	}
	.docsmith-version-banner a {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-weight: 600;
		color: var(--primary);
		white-space: nowrap;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
