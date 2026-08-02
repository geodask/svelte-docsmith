<script lang="ts">
	import { Button } from '$lib/components/shadcn/button/index.js';
	import ThumbsUp from '@lucide/svelte/icons/thumbs-up';
	import ThumbsDown from '@lucide/svelte/icons/thumbs-down';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	const {
		path,
		onfeedback,
		editHref,
		issueHref
	}: {
		/** The current page path, passed to the callback so it can attribute votes. */
		path: string;
		/** Called once per page when the reader votes; wire it to your analytics. */
		onfeedback?: (vote: 'up' | 'down', path: string) => void;
		/** "Edit this page" target — offered after a "No" vote when present. */
		editHref?: string;
		/** "Open an issue" target — offered after a "No" vote when present. */
		issueHref?: string;
	} = $props();

	let vote = $state<'up' | 'down' | null>(null);

	const hasRecovery = $derived(Boolean(editHref || issueHref));

	function cast(value: 'up' | 'down') {
		if (vote) return;
		vote = value;
		onfeedback?.(value, path);
	}
</script>

<div class="flex flex-col items-center gap-2.5 text-center">
	{#if vote === 'up'}
		<p class="text-muted-foreground text-sm">Thanks for your feedback!</p>
	{:else if vote === 'down'}
		<p class="text-muted-foreground text-sm">
			{hasRecovery ? 'Thanks — want to help improve this page?' : 'Thanks for your feedback!'}
		</p>
		{#if hasRecovery}
			<div class="flex flex-wrap items-center justify-center gap-2">
				{#if editHref}
					<Button
						variant="outline"
						size="sm"
						href={editHref}
						target="_blank"
						rel="noopener noreferrer"
					>
						<SquarePen />
						Edit this page
					</Button>
				{/if}
				{#if issueHref}
					<Button
						variant="outline"
						size="sm"
						href={issueHref}
						target="_blank"
						rel="noopener noreferrer"
					>
						<ExternalLink />
						Open an issue
					</Button>
				{/if}
			</div>
		{/if}
	{:else}
		<p class="text-muted-foreground text-sm">Was this page helpful?</p>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => cast('up')}
				aria-label="Yes, this page was helpful"
			>
				<ThumbsUp />
				Yes
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={() => cast('down')}
				aria-label="No, this page was not helpful"
			>
				<ThumbsDown />
				No
			</Button>
		</div>
	{/if}
</div>
