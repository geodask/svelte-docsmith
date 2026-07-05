<script lang="ts" module>
	export type CalloutType = 'note' | 'tip' | 'warning' | 'danger';
</script>

<script lang="ts">
	import Info from '@lucide/svelte/icons/info';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import type { Component } from 'svelte';
	import type { Snippet } from 'svelte';

	const {
		type = 'note',
		title,
		children
	}: {
		/** Visual intent. Default: `note`. */
		type?: CalloutType;
		/** Optional heading; defaults to the capitalized type. */
		title?: string;
		children: Snippet;
	} = $props();

	const variants: Record<CalloutType, { icon: Component; label: string; klass: string }> = {
		note: { icon: Info, label: 'Note', klass: 'callout-note' },
		tip: { icon: Lightbulb, label: 'Tip', klass: 'callout-tip' },
		warning: { icon: TriangleAlert, label: 'Warning', klass: 'callout-warning' },
		danger: { icon: CircleAlert, label: 'Danger', klass: 'callout-danger' }
	};

	const variant = $derived(variants[type]);
	const Icon = $derived(variant.icon);
</script>

<div role="note" class="not-prose callout {variant.klass}">
	<Icon class="callout-icon" size={18} aria-hidden="true" />
	<div class="callout-body">
		<p class="callout-title">{title ?? variant.label}</p>
		<div class="callout-content">{@render children()}</div>
	</div>
</div>

<style>
	.callout {
		display: flex;
		gap: 0.75rem;
		margin: 1.5rem 0;
		padding: 1rem 1.1rem;
		border: 1px solid;
		border-radius: var(--radius);
		background: var(--callout-bg);
		border-color: var(--callout-border);
	}
	:global(.callout .callout-icon) {
		margin-top: 0.1rem;
		flex-shrink: 0;
		color: var(--callout-accent);
	}
	.callout-body {
		min-width: 0;
	}
	.callout-title {
		margin: 0;
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--callout-accent);
	}
	.callout-content {
		margin-top: 0.25rem;
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--foreground);
	}
	.callout-content :global(:first-child) {
		margin-top: 0;
	}
	.callout-content :global(:last-child) {
		margin-bottom: 0;
	}
	.callout-content :global(a) {
		color: var(--callout-accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.callout-content :global(code) {
		font-family: var(--font-mono);
		font-size: 0.85em;
	}

	/* Tints are built from a single hue per type so light and dark both read
	   correctly; body copy stays on --foreground for contrast. */
	.callout-note {
		--callout-accent: oklch(0.58 0.13 250);
		--callout-bg: oklch(0.58 0.13 250 / 0.08);
		--callout-border: oklch(0.58 0.13 250 / 0.28);
	}
	.callout-tip {
		--callout-accent: oklch(0.6 0.13 160);
		--callout-bg: oklch(0.6 0.13 160 / 0.08);
		--callout-border: oklch(0.6 0.13 160 / 0.28);
	}
	.callout-warning {
		--callout-accent: oklch(0.62 0.14 75);
		--callout-bg: oklch(0.62 0.14 75 / 0.1);
		--callout-border: oklch(0.62 0.14 75 / 0.3);
	}
	.callout-danger {
		--callout-accent: var(--destructive);
		--callout-bg: oklch(0.64 0.21 25 / 0.08);
		--callout-border: oklch(0.64 0.21 25 / 0.28);
	}
	:global(.dark) .callout-note {
		--callout-accent: oklch(0.75 0.12 250);
	}
	:global(.dark) .callout-tip {
		--callout-accent: oklch(0.78 0.13 160);
	}
	:global(.dark) .callout-warning {
		--callout-accent: oklch(0.82 0.13 80);
	}
	:global(.dark) .callout-danger {
		--callout-accent: oklch(0.72 0.17 25);
	}
</style>
