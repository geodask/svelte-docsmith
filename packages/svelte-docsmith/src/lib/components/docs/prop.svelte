<script lang="ts">
	import type { Snippet } from 'svelte';
	import { deprecationNote } from '../../core/props-reference.js';
	import { unionMembers } from '../../utils/type-text.js';

	const {
		name,
		type,
		required = false,
		bindable = false,
		deprecated,
		default: defaultValue,
		children
	}: {
		/** Property name. */
		name: string;
		/** Type signature, shown as code. */
		type?: string;
		/** Mark the property as required. */
		required?: boolean;
		/** Mark the property as bindable with `bind:`. */
		bindable?: boolean;
		/** Mark the property as deprecated; a string says what to use instead. */
		deprecated?: boolean | string;
		/** Default value, shown alongside the type. */
		default?: string;
		/** Description. */
		children?: Snippet;
	} = $props();

	// Split a top-level union into per-value chips so long ones wrap as a tidy
	// pill group instead of ugly broken text. A `|` nested in a generic
	// (`Array<A | B>`) or inside a signature (`() => A | B`) stays put, so
	// those render as one chip that wraps on its own.
	const typeParts = $derived(type ? unionMembers(type) : []);
	const solo = $derived(typeParts.length === 1);
</script>

<div class="prop-row">
	<div class="prop-head">
		<code class="prop-name">{name}</code>
		{#if required}<span class="prop-required">required</span>{/if}
		{#if bindable}<span class="prop-flag">bindable</span>{/if}
		{#if deprecated}<span class="prop-flag prop-flag-deprecated">deprecated</span>{/if}

		{#if type}
			<span class="prop-types">
				{#each typeParts as part (part)}
					<code class="type-chip" class:type-chip-solo={solo}>{part}</code>
				{/each}
			</span>
		{/if}

		{#if defaultValue !== undefined}
			<span class="prop-default">
				<span class="prop-default-label">default</span>
				<code>{defaultValue}</code>
			</span>
		{/if}
	</div>

	{#if typeof deprecated === 'string' && deprecated}
		<div class="prop-desc prop-deprecated-note">{deprecationNote(deprecated)}</div>
	{/if}
	{#if children}
		<div class="prop-desc">{@render children()}</div>
	{/if}
</div>

<style>
	.prop-row {
		padding: 0.95rem 1rem;
		border-top: 1px solid var(--border);
	}
	.prop-row:first-child {
		border-top: none;
	}

	/* Name + required + type + default flow on one wrapping line. */
	.prop-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 0.6rem;
		min-width: 0;
	}

	/* Name is the anchor you scan for: mono, ink, medium weight. */
	.prop-name {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
	}

	/* Solid brand pill — the sanctioned primary-foreground-on-primary pairing,
	   so it stays legible in both themes (terracotta-on-tint fails AA in light). */
	.prop-required {
		padding: 0.05rem 0.4rem;
		border-radius: 9999px;
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	/* Secondary marks (bindable, deprecated): outlined so they never compete
	   with the solid required pill. */
	.prop-flag {
		padding: 0.05rem 0.4rem;
		border-radius: 9999px;
		border: 1px solid var(--border);
		color: var(--muted-foreground);
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}
	.prop-flag-deprecated {
		text-decoration: line-through;
	}

	/* Type values as chips: a union wraps as a neat pill group, each token
	   unbroken. A lone signature/generic wraps within itself on narrow screens. */
	.prop-types {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		min-width: 0;
	}
	.type-chip {
		padding: 0.05rem 0.4rem;
		border-radius: 0.4rem;
		border: 1px solid var(--border);
		background: color-mix(in oklch, var(--muted) 55%, transparent);
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.78rem;
		color: var(--foreground);
		white-space: nowrap;
	}
	.type-chip-solo {
		white-space: normal;
		overflow-wrap: anywhere;
		max-width: 100%;
	}

	/* Default sits at the end of the line, pushed right when there's room. */
	.prop-default {
		display: inline-flex;
		align-items: baseline;
		gap: 0.35rem;
		margin-left: auto;
		white-space: nowrap;
	}
	.prop-default-label {
		font-size: 0.7rem;
		color: var(--muted-foreground);
	}
	.prop-default code {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.78rem;
		color: var(--foreground);
	}

	.prop-desc {
		margin-top: 0.5rem;
		color: var(--muted-foreground);
		font-size: 0.875rem;
		line-height: 1.55;
		max-width: 68ch;
	}
	.prop-deprecated-note + .prop-desc {
		margin-top: 0.25rem;
	}
	.prop-desc :global(p) {
		margin: 0;
	}
	.prop-desc :global(* + p),
	.prop-desc :global(* + div) {
		margin-top: 0.4rem;
	}
	.prop-desc :global(code) {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.85em;
		padding: 0.05em 0.3em;
		border-radius: 0.3rem;
		background: color-mix(in oklch, var(--muted) 60%, transparent);
		color: var(--foreground);
	}
	.prop-desc :global(a) {
		color: var(--primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
