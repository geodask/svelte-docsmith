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
	// A reader who dismissed it sees a brief bar on reload, which beats popping
	// the bar in for everyone on every load.
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
</script>

{#if !dismissed}
	<div class="announcement" role="region" aria-label="Announcement">
		<div class="announcement-inner">
			{#if announcement.href}
				<a
					class="announcement-link"
					href={announcement.href}
					target={announcement.external ? '_blank' : undefined}
					rel={announcement.external ? 'noopener noreferrer' : undefined}
				>
					<span>{announcement.text}</span>
					<ArrowRight class="announcement-arrow size-3.5" aria-hidden="true" />
				</a>
			{:else}
				<span>{announcement.text}</span>
			{/if}
		</div>

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
	/* A thin, brand-tinted bar above the header. The one warm accent reads as an
	   announcement without shouting; text stays on --foreground for AA contrast. */
	.announcement {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 2.5rem;
		padding: 0.4rem 3rem;
		background: color-mix(in oklch, var(--primary) 10%, var(--background));
		border-bottom: 1px solid color-mix(in oklch, var(--primary) 22%, var(--border));
		color: var(--foreground);
		font-size: 0.8125rem;
		line-height: 1.4;
		text-align: center;
	}

	.announcement-inner {
		min-width: 0;
	}

	.announcement-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--foreground);
		font-weight: 500;
		text-decoration: none;
	}
	.announcement-link :global(.announcement-arrow) {
		color: var(--primary);
		transition: transform 0.2s ease-out;
	}
	.announcement-link:hover {
		color: var(--primary);
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
