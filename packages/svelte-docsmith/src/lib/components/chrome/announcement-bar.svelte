<script lang="ts">
	import { BROWSER } from 'esm-env';
	import X from '@lucide/svelte/icons/x';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import type { DocsmithAnnouncement } from '$lib/core/index.js';

	const { announcement }: { announcement: DocsmithAnnouncement } = $props();

	const dismissible = $derived(announcement.dismissible ?? true);
	const storageKey = $derived('docsmith-announcement:' + (announcement.id ?? announcement.text));

	// Rendered visible on the server; the dismissal is read after mount so the
	// first client render matches the server and there's no hydration mismatch.
	// The blocking <head> script below is what actually prevents the flash on a
	// reload — this effect just removes the (already-hidden) element from the DOM.
	let dismissed = $state(false);
	$effect(() => {
		if (!dismissible) return;
		try {
			dismissed = localStorage.getItem(storageKey) === '1';
		} catch {
			// storage unavailable; treat as not dismissed
		}
	});

	function dismiss() {
		dismissed = true;
		if (BROWSER) {
			try {
				localStorage.setItem(storageKey, '1');
			} catch {
				// storage unavailable; dismissal holds for this session only
			}
		}
	}

	// A blocking snippet run in <head> before first paint: if this bar was
	// already dismissed, hide it via an injected style so it is never painted
	// and can't shift the layout when hydration removes it. Targets a stable
	// class (not the scoped one) so it also works in dev, where component CSS is
	// injected after paint. localStorage is read here because it isn't available
	// during SSR.
	const preventFlashScript = $derived(
		`(function(){try{if(localStorage.getItem(${JSON.stringify(storageKey)})==="1"){` +
			`var s=document.createElement("style");` +
			`s.textContent=".docsmith-announcement{display:none!important}";` +
			`document.head.appendChild(s)}}catch(e){}})()`
	);
</script>

<svelte:head>
	{#if dismissible}
		<!-- The `<\/script>` escape keeps the Svelte parser from ending the tag early. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags, no-useless-escape -->
		{@html `<script>${preventFlashScript}<\/script>`}
	{/if}
</svelte:head>

{#if !dismissed}
	<div class="announcement docsmith-announcement" role="region" aria-label="Announcement">
		{#if announcement.href}
			<a
				class="announcement-body announcement-link"
				href={announcement.href}
				target={announcement.external ? '_blank' : undefined}
				rel={announcement.external ? 'noopener noreferrer' : undefined}
			>
				{#if announcement.tag}<span class="announcement-tag">{announcement.tag}</span>{/if}
				<span class="announcement-text">{announcement.text}</span>
				<ArrowRight class="announcement-arrow size-3.5" aria-hidden="true" />
			</a>
		{:else}
			<div class="announcement-body">
				{#if announcement.tag}<span class="announcement-tag">{announcement.tag}</span>{/if}
				<span class="announcement-text">{announcement.text}</span>
			</div>
		{/if}

		{#if dismissible}
			<button
				type="button"
				class="announcement-dismiss"
				onclick={dismiss}
				aria-label="Dismiss announcement"
			>
				<X class="size-3.5" aria-hidden="true" />
			</button>
		{/if}
	</div>
{/if}

<style>
	/* A thin bar above the header. The warm accent is spent on a solid tag, not
	   a full-width wash, so it reads as a deliberate mark; text stays on
	   --foreground for AA contrast. */
	.announcement {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 2.5rem;
		padding: 0.4rem 2.75rem;
		background: color-mix(in oklch, var(--primary) 6%, var(--background));
		border-bottom: 1px solid color-mix(in oklch, var(--primary) 20%, var(--border));
		color: var(--foreground);
		font-size: 0.8125rem;
		line-height: 1.4;
		text-align: center;
	}

	.announcement-body {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.3rem 0.55rem;
		min-width: 0;
		color: var(--foreground);
		text-decoration: none;
	}

	/* Solid brand pill — the sanctioned primary-foreground-on-primary pairing, so
	   it stays legible in both themes and matches the props-table "required" pill. */
	.announcement-tag {
		flex-shrink: 0;
		background: var(--primary);
		color: var(--primary-foreground);
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0.15rem 0.5rem;
		border-radius: 9999px;
		line-height: 1.5;
	}

	.announcement-text {
		color: var(--foreground);
	}

	.announcement-link :global(.announcement-arrow) {
		flex-shrink: 0;
		color: var(--primary);
		transition: transform 0.2s ease-out;
	}
	.announcement-link:hover :global(.announcement-arrow) {
		transform: translateX(2px);
	}
	@media (prefers-reduced-motion: reduce) {
		.announcement-link :global(.announcement-arrow) {
			transition: none;
		}
	}

	/* Dismiss sits at the trailing edge, inside the bar's padding. */
	.announcement-dismiss {
		position: absolute;
		top: 50%;
		right: 0.5rem;
		transform: translateY(-50%);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
		border: 0;
		background: transparent;
		border-radius: 0.375rem;
		color: var(--muted-foreground);
		cursor: pointer;
		transition:
			color 0.15s ease-out,
			background-color 0.15s ease-out;
	}
	.announcement-dismiss:hover {
		color: var(--foreground);
		background: color-mix(in oklch, var(--foreground) 8%, transparent);
	}
	.announcement-dismiss:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 1px;
	}
	@media (prefers-reduced-motion: reduce) {
		.announcement-dismiss {
			transition: none;
		}
	}
</style>
