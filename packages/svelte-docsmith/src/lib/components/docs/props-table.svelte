<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ExtractedProps } from '../../core/extracted-props.js';
	import { propsReference } from '../../core/props-reference.js';
	import Prop from './prop.svelte';

	const {
		title,
		of,
		children
	}: {
		/** Caption. Defaults to the component's name when `of` is given. */
		title?: string;
		/**
		 * A props import (`import props from './button.svelte?props'`): renders
		 * the rows from the component's own source instead of `children`.
		 */
		of?: ExtractedProps;
		/** Hand-written `<Prop>` rows. */
		children?: Snippet;
	} = $props();

	const reference = $derived(of && propsReference(of, title));
	const caption = $derived(reference ? reference.caption : title);
</script>

<!--
	A component API reference. Generate it from the component's own source:

	  import badgeProps from '#lib/badge.svelte?props';
	  <PropsTable of={badgeProps} />

	or compose it from <Prop> rows:

	  <PropsTable title="Badge">
	    <Prop name="variant" type="'a' | 'b'" default="'a'">Visual intent.</Prop>
	    <Prop name="href" type="string" required>Turns it into a link.</Prop>
	  </PropsTable>

	Rows stack (name/type/default on one line, description below) so long type
	signatures never force a horizontal scroll or crush the description.
-->
<div class="props-table not-prose">
	{#if caption}
		<div class="props-table-caption">
			<span class="props-table-caption-mark" aria-hidden="true">&lt;/&gt;</span>
			<span class="props-table-caption-name">{caption}</span>
		</div>
	{/if}
	<div class="props-list">
		{#if reference}
			{#each reference.rows as row (row.name)}
				{#snippet description()}
					{#each row.description as paragraph, i (i)}
						<!-- Build-time HTML rendered from the component's own JSDoc. -->
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<div>{@html paragraph}</div>
					{/each}
				{/snippet}
				<Prop
					name={row.name}
					type={row.type}
					default={row.default}
					required={row.required}
					bindable={row.bindable}
					deprecated={row.deprecated}
					children={row.description.length ? description : undefined}
				/>
			{/each}
			{#each reference.notes as note, i (i)}
				<div class="props-note">
					{#each note as part, j (j)}{#if typeof part === 'string'}{part}{:else}<code
								>{part.code}</code
							>{/if}{/each}
				</div>
			{/each}
		{:else}
			{@render children?.()}
		{/if}
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

	/* Notes (inherited attributes, an empty table) sit in the row
	   rhythm but read as a footnote, not another prop. */
	.props-note {
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--border);
		color: var(--muted-foreground);
		font-size: 0.8125rem;
	}
	.props-note:first-child {
		border-top: none;
	}
	.props-note code {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.78rem;
		color: var(--foreground);
	}
</style>
