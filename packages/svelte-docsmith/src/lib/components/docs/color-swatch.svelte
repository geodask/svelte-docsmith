<script lang="ts" module>
	/** `--x` from a value that is only `var(--x)` (with or without a fallback). */
	export function variableName(value: string): string | undefined {
		return /^\s*var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)\s*$/.exec(value)?.[1];
	}
</script>

<script lang="ts">
	const {
		value,
		name
	}: {
		/** Any CSS colour: `#3b82f6`, `oklch(0.6 0.2 260)` or `var(--brand)`. */
		value: string;
		/**
		 * The label under the swatch.
		 * @default the variable's name for `var(--x)`, otherwise the value
		 */
		name?: string;
	} = $props();

	const label = $derived(name ?? variableName(value) ?? value);

	// Until the browser resolves it (and on the server), the value as written.
	let resolved = $state<string | undefined>();
	const shown = $derived(resolved ?? value);

	/**
	 * Resolve the colour on the element, and again whenever the colour mode or
	 * theme changes: both are classes and inline styles on the root element.
	 */
	function resolve(swatch: HTMLElement) {
		const read = () => {
			// A custom property's computed value has its var()s substituted, so
			// it is the colour in the author's own notation, not rgb().
			const text = getComputedStyle(swatch).getPropertyValue('--docsmith-swatch').trim();
			resolved = text || undefined;
		};
		read();
		const observer = new MutationObserver(read);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class', 'style']
		});
		return { destroy: () => observer.disconnect() };
	}
</script>

<div class="docsmith-swatch not-prose">
	<span
		class="docsmith-swatch-colour"
		style:--docsmith-swatch={value}
		use:resolve
		aria-hidden="true"
	></span>
	<span class="docsmith-swatch-name">{label}</span>
	{#if shown !== label}
		<code class="docsmith-swatch-value">{shown}</code>
	{/if}
</div>

<style>
	.docsmith-swatch {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
		font-size: 0.875rem;
	}
	/* A checkerboard behind the colour, so a translucent one shows as such, and
	   a hairline so a colour on the page's own background keeps its edge. */
	.docsmith-swatch-colour {
		display: block;
		height: 4rem;
		margin-bottom: 0.375rem;
		border-radius: calc(var(--radius) - 2px);
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 12%, transparent);
		background-image:
			linear-gradient(var(--docsmith-swatch), var(--docsmith-swatch)),
			repeating-conic-gradient(var(--muted) 0% 25%, var(--background) 0% 50%);
		background-size:
			auto,
			12px 12px;
	}
	.docsmith-swatch-name {
		font-weight: 500;
		color: var(--foreground);
		overflow-wrap: anywhere;
	}
	.docsmith-swatch-value {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--muted-foreground);
		overflow-wrap: anywhere;
	}
</style>
