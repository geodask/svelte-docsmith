<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ExtractedProps } from '../../core/extracted-props.js';
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

	const caption = $derived(
		title ?? (of && of.name + (of.typeParameters.length ? `<${of.typeParameters.join(', ')}>` : ''))
	);
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
		{#if of}
			{#each of.props as prop (prop.name)}
				{#if prop.description || prop.deprecated}
					<Prop
						name={prop.name}
						type={prop.type}
						default={prop.default}
						required={prop.required}
						bindable={prop.bindable}
						deprecated={prop.deprecated !== undefined}
					>
						<!-- Build-time HTML rendered from the component's own JSDoc. -->
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{#if prop.deprecated}<div>Deprecated: {@html prop.deprecated}</div>{/if}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{#if prop.description}<div>{@html prop.description}</div>{/if}
					</Prop>
				{:else}
					<Prop
						name={prop.name}
						type={prop.type}
						default={prop.default}
						required={prop.required}
						bindable={prop.bindable}
						deprecated={prop.deprecated !== undefined}
					/>
				{/if}
			{/each}
			{#each of.inherited as group (group.label)}
				<div class="props-inherited">
					Also accepts every
					{#if group.kind === 'element'}
						<code>&lt;{group.label}&gt;</code> attribute.
					{:else}
						prop of <code>{group.label}</code>.
					{/if}
				</div>
			{/each}
			{#if of.props.length === 0 && of.inherited.length === 0}
				<div class="props-inherited">No props.</div>
			{/if}
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

	/* Summary lines (inherited attributes, an empty table) sit in the row
	   rhythm but read as a footnote, not another prop. */
	.props-inherited {
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--border);
		color: var(--muted-foreground);
		font-size: 0.8125rem;
	}
	.props-inherited:first-child {
		border-top: none;
	}
	.props-inherited code {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.78rem;
		color: var(--foreground);
	}
</style>
