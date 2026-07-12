<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		title,
		children
	}: {
		/** Optional caption — the component name when a page documents several. */
		title?: string;
		children: Snippet;
	} = $props();
</script>

<!--
	A component API reference. Compose it from <Prop> rows:

	  <PropsTable title="Badge">
	    <Prop name="variant" type="'a' | 'b'" default="'a'">Visual intent.</Prop>
	    <Prop name="href" type="string" required>Turns it into a link.</Prop>
	  </PropsTable>

	Rows stack (name/type/default on one line, description below) so long type
	signatures never force a horizontal scroll or crush the description.
-->
<div class="props-table not-prose">
	{#if title}
		<div class="props-table-caption">
			<span class="props-table-caption-mark" aria-hidden="true">&lt;/&gt;</span>
			<span class="props-table-caption-name">{title}</span>
		</div>
	{/if}
	<div class="props-list">
		{@render children()}
	</div>
</div>

<style>
	.props-table {
		margin: 1.75rem 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
		overflow: hidden;
	}

	/* Caption = which component. Mono + ink weight, distinct from the rows below
	   it so the header never reads as one grey slab. */
	.props-table-caption {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid var(--border);
		background: color-mix(in oklch, var(--muted) 55%, var(--card));
	}
	.props-table-caption-mark {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--primary);
		opacity: 0.85;
	}
	.props-table-caption-name {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--foreground);
	}

	/* Each child <Prop> is a `.prop-row` with its own border-top. */
	.props-list {
		min-width: 0;
	}
</style>
