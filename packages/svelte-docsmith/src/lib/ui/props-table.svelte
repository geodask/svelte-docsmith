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
-->
<div class="props-table not-prose">
	{#if title}
		<div class="props-table-caption">
			<span class="props-table-caption-mark" aria-hidden="true">&lt;/&gt;</span>
			<span class="props-table-caption-name">{title}</span>
		</div>
	{/if}
	<div class="props-table-scroll">
		<table>
			<thead>
				<tr>
					<th class="col-prop">Prop</th>
					<th class="col-type">Type</th>
					<th class="col-default">Default</th>
					<th class="col-desc">Description</th>
				</tr>
			</thead>
			<tbody>
				{@render children()}
			</tbody>
		</table>
	</div>
</div>

<style>
	.props-table {
		margin: 1.75rem 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
		/* Clip the scroll region to the rounded corners. */
		overflow: hidden;
	}

	/* Caption = which component. Mono + ink weight, distinct from the quiet
	   column-header row below it so the two never read as one grey slab. */
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

	.props-table-scroll {
		overflow-x: auto;
	}
	.props-table table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	/* Column headers: quiet labels, no fill — the caption owns the emphasis. */
	.props-table :global(thead th) {
		text-align: left;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--muted-foreground);
		padding: 0.55rem 1rem;
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
	}
	/* Prop / Default shrink to their content; Type flexes; Description holds width. */
	.props-table :global(.col-prop),
	.props-table :global(.col-default) {
		width: 1%;
	}
	.props-table :global(.col-desc) {
		width: 40%;
	}

	.props-table :global(tbody td) {
		padding: 0.7rem 1rem;
		vertical-align: baseline;
		border-top: 1px solid var(--border);
		transition: background-color 120ms ease;
	}
	.props-table :global(tbody tr:first-child td) {
		border-top: none;
	}
	.props-table :global(tbody tr:hover td) {
		background: color-mix(in oklch, var(--muted) 45%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		.props-table :global(tbody td) {
			transition: none;
		}
	}
</style>
