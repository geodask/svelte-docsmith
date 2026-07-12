<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		name,
		type,
		required = false,
		default: defaultValue,
		children
	}: {
		/** Property name. */
		name: string;
		/** Type signature, shown as code. */
		type?: string;
		/** Mark the property as required. */
		required?: boolean;
		/** Default value, shown alongside the type. */
		default?: string;
		/** Description. */
		children?: Snippet;
	} = $props();

	// Split a union into per-value chips so long ones wrap as a tidy pill group
	// instead of ugly broken text. Skip splitting when the type is a generic
	// (`Array<A | B>`) or a signature (`() => …`) where a top-level `|` split
	// would be wrong — those render as one chip that wraps on its own.
	const typeParts = $derived.by(() => {
		if (!type) return [];
		if (/[<(]/.test(type)) return [type];
		return type
			.split('|')
			.map((s) => s.trim())
			.filter(Boolean);
	});
	const solo = $derived(typeParts.length === 1);
</script>

<div class="prop-row">
	<div class="prop-head">
		<code class="prop-name">{name}</code>
		{#if required}<span class="prop-required">required</span>{/if}

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
