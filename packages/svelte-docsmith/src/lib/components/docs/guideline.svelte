<script lang="ts">
	// Internal: what <Do> and <Dont> both draw. A panel with a coloured top edge
	// and a label that says which it is in words and with an icon, so it reads
	// without colour vision.
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	const { kind, label, children }: { kind: 'do' | 'dont'; label: string; children: Snippet } =
		$props();

	const Icon = $derived(kind === 'do' ? Check : X);
</script>

<div class="docsmith-guideline docsmith-guideline-{kind}">
	<p class="docsmith-guideline-label">
		<Icon size={16} strokeWidth={2.5} aria-hidden="true" />
		{label}
	</p>
	<div class="docsmith-guideline-content">{@render children()}</div>
</div>

<style>
	/* :where keeps the margin weaker than a Columns cell's, which zeroes it. */
	:where(.docsmith-guideline) {
		margin: 1.5rem 0;
	}
	.docsmith-guideline {
		border: 1px solid var(--border);
		border-top: 3px solid var(--guideline-accent);
		border-radius: var(--radius);
		padding: 0.875rem 1rem 1rem;
	}
	.docsmith-guideline-do {
		--guideline-accent: var(--docsmith-do);
	}
	.docsmith-guideline-dont {
		--guideline-accent: var(--docsmith-dont);
	}
	.docsmith-guideline-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin: 0 0 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--guideline-accent);
	}
	.docsmith-guideline-content > :global(:first-child) {
		margin-top: 0;
	}
	.docsmith-guideline-content > :global(:last-child) {
		margin-bottom: 0;
	}
</style>
