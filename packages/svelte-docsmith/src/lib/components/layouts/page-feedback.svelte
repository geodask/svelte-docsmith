<script lang="ts">
	import { Button } from '$lib/components/shadcn/button/index.js';
	import ThumbsUp from '@lucide/svelte/icons/thumbs-up';
	import ThumbsDown from '@lucide/svelte/icons/thumbs-down';

	const {
		path,
		onfeedback
	}: {
		/** The current page path, passed to the callback so it can attribute votes. */
		path: string;
		/** Called once per page when the reader votes; wire it to your analytics. */
		onfeedback?: (vote: 'up' | 'down', path: string) => void;
	} = $props();

	let vote = $state<'up' | 'down' | null>(null);

	function cast(value: 'up' | 'down') {
		if (vote) return;
		vote = value;
		onfeedback?.(value, path);
	}
</script>

<div class="flex flex-col items-center gap-2.5 text-center">
	{#if vote}
		<p class="text-muted-foreground text-sm">Thanks for your feedback!</p>
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
