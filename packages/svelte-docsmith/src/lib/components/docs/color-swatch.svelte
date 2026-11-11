<script lang="ts" module>
	/** `--x` from a value that is only `var(--x)` (with or without a fallback). */
	export function variableName(value: string): string | undefined {
		const match = /^\s*var\(\s*(--[\w-]+)\s*[,)]/.exec(value);
		if (!match) return undefined;
		// The var() must close at the very end, so `var(--a) var(--b)` is not one.
		// The fallback can hold brackets of its own: `var(--a, rgb(0 0 0))`.
		let depth = 1;
		let i = value.indexOf('(');
		while (depth > 0 && ++i < value.length) {
			if (value[i] === '(') depth++;
			else if (value[i] === ')') depth--;
		}
		return depth === 0 && value.slice(i + 1).trim() === '' ? match[1] : undefined;
	}

	/** A colour written as itself: a hex, a name or one function of numbers. */
	function isPlainColour(text: string): boolean {
		return /^(#[\da-f]+|[a-z-]+|[a-z]+\([^()]*\))$/i.test(text);
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

	let swatch = $state<HTMLElement>();

	/**
	 * Resolve the colour on the element: again when the value changes, and when
	 * the colour mode or theme does, whether that is an attribute on the root
	 * element (docsmith's class, a site's data-theme) or the system setting.
	 */
	$effect(() => {
		const element = swatch;
		void value;
		if (!element) return;
		const read = () => {
			const style = getComputedStyle(element);
			// A custom property's computed value has its var()s substituted, so
			// a plain colour comes back in the author's own notation. A derived
			// one, such as a color-mix(), is read as the colour it paints.
			const text = style.getPropertyValue('--docsmith-swatch').trim();
			if (!text) resolved = undefined;
			else resolved = isPlainColour(text) ? text : style.color || text;
		};
		read();
		const observer = new MutationObserver(read);
		observer.observe(document.documentElement, { attributes: true });
		const scheme = matchMedia('(prefers-color-scheme: dark)');
		scheme.addEventListener('change', read);
		return () => {
			observer.disconnect();
			scheme.removeEventListener('change', read);
		};
	});
</script>

<div class="docsmith-swatch not-prose">
	<span
		class="docsmith-swatch-colour"
		style:--docsmith-swatch={value}
		bind:this={swatch}
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
		/* Read back to name a derived colour by what it paints. */
		color: var(--docsmith-swatch);
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
