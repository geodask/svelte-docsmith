<script lang="ts">
	import type { Snippet } from 'svelte';

	// mdsvex maps every markdown `<table>` to this component, so plain markdown
	// tables (API entry points, token lists, frontmatter fields) render with the
	// same bordered, quiet-header look as the PropsTable component. Authors write
	// normal markdown; the styling is automatic.
	const { children }: { children: Snippet } = $props();
</script>

<div class="md-table not-prose">
	<div class="md-table-scroll">
		<table>
			{@render children()}
		</table>
	</div>
</div>

<style>
	.md-table {
		margin: 1.75rem 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
		overflow: hidden;
	}
	.md-table-scroll {
		overflow-x: auto;
	}
	.md-table table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.md-table :global(thead th) {
		text-align: left;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--muted-foreground);
		padding: 0.6rem 1rem;
		border-bottom: 1px solid var(--border);
		background: color-mix(in oklch, var(--muted) 55%, var(--card));
		white-space: nowrap;
	}
	.md-table :global(tbody td) {
		padding: 0.7rem 1rem;
		vertical-align: baseline;
		border-top: 1px solid var(--border);
		color: var(--foreground);
		transition: background-color 120ms ease;
	}
	.md-table :global(tbody tr:first-child td) {
		border-top: none;
	}
	.md-table :global(tbody tr:hover td) {
		background: color-mix(in oklch, var(--muted) 45%, transparent);
	}
	/* Inline code inside cells: subtle chip so token names stay scannable. */
	.md-table :global(td code),
	.md-table :global(th code) {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.82em;
		padding: 0.05em 0.35em;
		border-radius: 0.35rem;
		background: color-mix(in oklch, var(--muted) 60%, transparent);
		white-space: nowrap;
	}
	.md-table :global(td a) {
		color: var(--primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.md-table :global(tbody td) {
			transition: none;
		}
	}
</style>
