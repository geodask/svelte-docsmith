<script lang="ts">
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import type { ExtractedProp, ExtractedProps } from '../../core/extracted-props.js';
	import { controlledProps, usageLine, type PlaygroundValues } from '../../core/playground.js';
	import { plainDescription } from '../../core/props-reference.js';
	import { useClipboard } from '#lib/utils/clipboard.svelte.js';
	import { Button } from '../shadcn/button/index.js';
	import CopyButton from '../chrome/copy-button.svelte';

	let {
		of,
		values = $bindable(),
		onreset
	}: {
		/** The component's props import. */
		of: ExtractedProps;
		/** The current values, written as the reader edits a control. */
		values: PlaygroundValues;
		/** Put every control back to its starting value. */
		onreset: () => void;
	} = $props();

	const controlled = $derived(controlledProps(of));
	const usage = $derived(usageLine(of, values));
	const clipboard = useClipboard();

	/** Up to this many options show as buttons; more become a select. */
	const MAX_SEGMENTS = 4;

	/**
	 * A prop with no literal default can be left unset, so the component
	 * applies its own fallback (a computed default, say). A required one that
	 * starts unset shows it, rather than a choice it doesn't have.
	 */
	const unsettable = (prop: ExtractedProp) => prop.literalDefault === undefined;

	const setValue = (name: string, value: unknown) => {
		values[name] = value;
	};
</script>

<div class="props-controls border-t border-border px-4 py-3 text-sm">
	<div class="mb-2 flex items-center justify-between">
		<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Controls</span>
		<Button variant="ghost" size="xs" onclick={onreset}>
			<RotateCcw />
			Reset
		</Button>
	</div>

	<div class="controls-grid">
		{#each controlled as prop (prop.name)}
			{@const control = prop.control!}
			{@const value = values[prop.name]}
			<code class="control-name" title={plainDescription(prop.description)}>{prop.name}</code>
			<div class="control-input">
				{#if control.kind === 'boolean'}
					<button
						type="button"
						role="switch"
						aria-checked={value === true}
						aria-label={prop.name}
						class="switch"
						onclick={() => setValue(prop.name, value !== true)}
					>
						<span class="switch-thumb"></span>
					</button>
				{:else if control.kind === 'options'}
					{@const choices = unsettable(prop) ? [undefined, ...control.options] : control.options}
					{#if choices.length <= MAX_SEGMENTS}
						<div class="segments" role="group" aria-label={prop.name}>
							{#each choices as choice, i (i)}
								<button
									type="button"
									class="segment"
									class:segment-unset={choice === undefined}
									aria-pressed={value === choice}
									onclick={() => setValue(prop.name, choice)}
								>
									{choice ?? 'unset'}
								</button>
							{/each}
						</div>
					{:else}
						<select
							class="field"
							aria-label={prop.name}
							value={String(choices.indexOf(value as string | number | undefined))}
							onchange={(e) => setValue(prop.name, choices[Number(e.currentTarget.value)])}
						>
							{#each choices as choice, i (i)}
								<option value={String(i)}>{choice ?? 'unset'}</option>
							{/each}
						</select>
					{/if}
				{:else if control.kind === 'text'}
					<input
						type="text"
						class="field"
						aria-label={prop.name}
						placeholder={prop.required ? '' : 'unset'}
						value={typeof value === 'string' ? value : ''}
						oninput={(e) => {
							const text = e.currentTarget.value;
							setValue(prop.name, text === '' && !prop.required ? undefined : text);
						}}
					/>
				{:else if control.kind === 'number'}
					<input
						type="number"
						class="field"
						aria-label={prop.name}
						placeholder={prop.required ? '' : 'unset'}
						value={typeof value === 'number' ? value : ''}
						oninput={(e) => {
							const n = e.currentTarget.valueAsNumber;
							setValue(prop.name, Number.isNaN(n) ? undefined : n);
						}}
					/>
				{/if}
			</div>
		{/each}
	</div>

	<div class="usage mt-3 flex items-start gap-1 rounded-md bg-muted pl-3">
		<pre class="flex-1 py-2 font-mono text-xs whitespace-pre-wrap">{usage}</pre>
		<CopyButton
			label="Copy usage"
			copied={clipboard.copied}
			onclick={() => clipboard.copy(usage)}
			class="shrink-0"
		/>
	</div>
</div>

<style>
	.controls-grid {
		display: grid;
		grid-template-columns: minmax(5rem, max-content) minmax(0, 1fr);
		align-items: center;
		gap: 0.5rem 1rem;
	}
	.control-name {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		color: var(--foreground);
		overflow-wrap: anywhere;
	}
	.control-input {
		min-width: 0;
	}

	.field {
		height: 2rem;
		width: 100%;
		max-width: 18rem;
		border-radius: calc(var(--radius) - 2px);
		border: 1px solid var(--input);
		background: var(--background);
		padding-inline: 0.5rem;
		font-size: 0.8125rem;
		color: var(--foreground);
	}
	.field:focus-visible,
	.segment:focus-visible,
	.switch:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}

	.segments {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0.125rem;
		border-radius: calc(var(--radius) - 2px);
		background: var(--muted);
		padding: 0.125rem;
	}
	.segment {
		border-radius: calc(var(--radius) - 4px);
		padding: 0.125rem 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--muted-foreground);
		cursor: pointer;
	}
	.segment:hover {
		color: var(--foreground);
	}
	.segment[aria-pressed='true'] {
		background: var(--background);
		color: var(--foreground);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
	}
	.segment-unset {
		font-style: italic;
		font-family: inherit;
	}

	.switch {
		position: relative;
		display: inline-flex;
		height: 1.25rem;
		width: 2.25rem;
		flex-shrink: 0;
		border-radius: 9999px;
		background: var(--input);
		transition: background-color 150ms;
		cursor: pointer;
	}
	.switch[aria-checked='true'] {
		background: var(--primary);
	}
	.switch-thumb {
		position: absolute;
		top: 0.125rem;
		left: 0.125rem;
		height: 1rem;
		width: 1rem;
		border-radius: 9999px;
		background: var(--background);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
		transition: transform 150ms;
	}
	.switch[aria-checked='true'] .switch-thumb {
		transform: translateX(1rem);
	}
	@media (prefers-reduced-motion: reduce) {
		.switch,
		.switch-thumb {
			transition: none;
		}
	}
</style>
