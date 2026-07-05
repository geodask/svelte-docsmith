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
		/** Default value, shown in its own column. */
		default?: string;
		/** Description. */
		children?: Snippet;
	} = $props();

	// Split a union into per-value chips so long ones wrap as a tidy pill group
	// instead of ugly broken text. Skip splitting when the type is a generic
	// (`Array<A | B>`) where a top-level `|` split would be wrong.
	const typeParts = $derived.by(() => {
		if (!type) return [];
		if (/[<(]/.test(type)) return [type];
		return type
			.split('|')
			.map((s) => s.trim())
			.filter(Boolean);
	});
</script>

<tr>
	<td class="prop-name">
		<code>{name}</code>
		{#if required}<span class="prop-required">required</span>{/if}
	</td>
	<td class="prop-type">
		{#each typeParts as part (part)}
			<code class="type-chip">{part}</code>
		{/each}
	</td>
	<td class="prop-default">
		{#if defaultValue !== undefined}
			<code>{defaultValue}</code>
		{:else}
			<span class="prop-none" aria-hidden="true">—</span>
		{/if}
	</td>
	<td class="prop-desc">
		{#if children}{@render children()}{/if}
	</td>
</tr>

<style>
	/* Name is the anchor you scan for: mono, ink, medium weight. */
	.prop-name {
		white-space: nowrap;
	}
	.prop-name code {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
	}
	/* Solid brand pill — the sanctioned primary-foreground-on-primary pairing,
	   so it stays legible in both themes (terracotta-on-tint fails AA in light). */
	.prop-required {
		display: inline-block;
		margin-left: 0.45rem;
		padding: 0.05rem 0.4rem;
		border-radius: 9999px;
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		vertical-align: 0.1em;
	}

	/* Type values as chips: a union wraps as a neat pill group, each token
	   unbroken. Single types render as one chip. */
	.prop-type {
		max-width: 26rem;
	}
	.type-chip {
		display: inline-block;
		margin: 0.1rem 0.3rem 0.1rem 0;
		padding: 0.05rem 0.4rem;
		border-radius: 0.4rem;
		border: 1px solid var(--border);
		background: color-mix(in oklch, var(--muted) 55%, transparent);
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.78rem;
		color: var(--foreground);
		white-space: nowrap;
	}

	.prop-default {
		white-space: nowrap;
	}
	.prop-default code {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.8125rem;
		color: var(--foreground);
	}
	.prop-none {
		color: var(--muted-foreground);
	}

	.prop-desc {
		color: var(--foreground);
		line-height: 1.55;
	}
	.prop-desc :global(code) {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.85em;
		padding: 0.05em 0.3em;
		border-radius: 0.3rem;
		background: color-mix(in oklch, var(--muted) 60%, transparent);
	}
	.prop-desc :global(a) {
		color: var(--primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
