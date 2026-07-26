<script lang="ts">
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import type { ResolvedVersion } from '$lib/core/index.js';

	// Rendered by DocsShell only on an archived version, to warn a reader who
	// landed there (usually from a search engine) and give them a one-click path
	// to the current equivalent. A real <a> (not client nav) so it works without
	// JS and stays crawlable.
	const {
		active,
		current,
		href
	}: {
		active: ResolvedVersion;
		current: ResolvedVersion;
		/** This page under the current version, from the resolved page view. */
		href: string;
	} = $props();
</script>

<div class="docsmith-version-banner" role="note">
	<TriangleAlert class="banner-icon" size={18} aria-hidden="true" />
	<p>
		You're reading the <strong>{active.label}</strong> docs. The current version is
		<strong>{current.label}</strong>.
		<a {href}>View this page in {current.label} <ArrowRight size={14} /></a>
	</p>
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
		color: var(--foreground);
		border-color: oklch(0.62 0.14 75 / 0.3);
		background: oklch(0.62 0.14 75 / 0.1);
	}
	:global(.docsmith-version-banner .banner-icon) {
		margin-top: 0.1rem;
		flex-shrink: 0;
		color: oklch(0.62 0.14 75);
	}
	:global(.dark) .docsmith-version-banner :global(.banner-icon) {
		color: oklch(0.82 0.13 80);
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
