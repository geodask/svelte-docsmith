<script module lang="ts">
	type Mermaid = (typeof import('mermaid'))['default'];

	// One shared import; the bundler dedupes the chunk, this dedupes the promise.
	let loaded: Promise<Mermaid> | undefined;
	const loadMermaid = () => (loaded ??= import('mermaid').then((m) => m.default));

	// `mermaid.initialize()` writes global config and `render()` is async, so two
	// diagrams rendering concurrently can apply each other's theme — most visibly
	// when one falls back to a built-in theme and reconfigures for everyone. Every
	// initialize/render pair runs through this queue so they never interleave.
	let chain: Promise<unknown> = Promise.resolve();

	function serialize<T>(job: () => Promise<T>): Promise<T> {
		const result = chain.then(job, job);
		// Swallow rejections on the chain itself so one bad diagram doesn't stall
		// the queue for the rest of the page.
		chain = result.catch(() => {});
		return result;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	// Rendered from a ```mermaid code fence: the preprocessor emits a lazy
	// `import('svelte-docsmith/mermaid')` so `mermaid` (an optional peer dep) is
	// only pulled into pages that actually contain a diagram. Rendering is
	// client-side — mermaid needs a DOM — with a `<pre>` source fallback.
	const { code }: { code: string } = $props();

	// Graph ids must be unique among elements currently in the document: mermaid
	// clears whatever already carries the id it's given, so a shared id silently
	// wipes another diagram that's already on the page. `$props.id()` is unique per
	// instance and stays unique even if two copies of this module end up loaded.
	const uid = $props.id();
	// Bumped per render, because the theme toggle re-renders while this instance's
	// previous SVG is still mounted — reusing the id would delete it mid-swap.
	let renders = 0;

	let svg = $state('');
	let failed = $state(false);
	// Whether the last render targeted dark mode, so we only re-render when the
	// site theme actually flips (not on every unrelated <html> class change).
	let lastDark: boolean | undefined;

	// Reused canvas for normalizing color tokens (see resolveColor); `null` once
	// we've determined this browser gives us no 2d context to work with.
	let colorCanvas: CanvasRenderingContext2D | null | undefined;

	// Assigning an unparseable colour to `fillStyle` is silently ignored rather
	// than throwing, so we set this first and check whether it survived. Any
	// colour works as long as it's an unlikely design token, since an unchanged
	// `fillStyle` is what tells us the assignment was rejected.
	const SENTINEL = '#010203';

	// Resolve a CSS color to a concrete `#rrggbb` string mermaid's color math
	// (khroma) can parse. Our design tokens are `oklch(...)`, which khroma can't
	// read. Reading `fillStyle` back is not enough to convert them: a browser
	// serializes a wide-gamut colour unchanged, so Chrome hands back the same
	// `oklch(...)` string it was given. Painting a pixel and reading its bytes
	// forces the conversion to sRGB. Returns null when the value can't be
	// resolved, which also covers an engine that doesn't understand oklch at all.
	function resolveColor(value: string): string | null {
		colorCanvas ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
		const ctx = colorCanvas;
		const input = value.trim();
		if (!ctx || !input) return null;
		ctx.fillStyle = SENTINEL;
		ctx.fillStyle = input;
		if (ctx.fillStyle === SENTINEL && input.toLowerCase() !== SENTINEL) return null;
		ctx.clearRect(0, 0, 1, 1);
		ctx.fillRect(0, 0, 1, 1);
		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
		return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
	}

	// Map the site's design tokens onto mermaid's documented theme variables, so a
	// diagram reads as part of the site (its palette, borders, text) instead of
	// mermaid's stock look. Read fresh each render so it follows the light/dark
	// toggle. Returns null when the tokens can't be resolved — the caller then
	// falls back to a built-in theme rather than shipping broken colors.
	function themeVariables(dark: boolean): Record<string, string | boolean> | null {
		const root = getComputedStyle(document.documentElement);
		const background = resolveColor(root.getPropertyValue('--background'));
		const foreground = resolveColor(root.getPropertyValue('--foreground'));
		const muted = resolveColor(root.getPropertyValue('--muted'));
		const mutedForeground = resolveColor(root.getPropertyValue('--muted-foreground'));
		const border = resolveColor(root.getPropertyValue('--border'));
		const accent = resolveColor(root.getPropertyValue('--accent'));
		const card = resolveColor(root.getPropertyValue('--card'));
		if (!background || !foreground || !muted || !mutedForeground || !border || !accent || !card) {
			return null;
		}
		// Only mermaid's documented base variables — it derives node/cluster/edge
		// colors from these, which keeps us off its more fragile internals.
		return {
			darkMode: dark,
			background,
			primaryColor: muted, // node fill
			primaryTextColor: foreground,
			primaryBorderColor: border,
			lineColor: mutedForeground, // edges/arrows
			secondaryColor: accent,
			tertiaryColor: card
		};
	}

	async function render() {
		let mermaid: Mermaid;
		try {
			mermaid = await loadMermaid();
		} catch {
			// `mermaid` isn't installed — fall back to the source.
			failed = true;
			return;
		}
		const dark = document.documentElement.classList.contains('dark');
		lastDark = dark;
		const vars = themeVariables(dark);
		// Try the token-themed `base` render first; if mermaid's color math rejects
		// anything, retry with a built-in theme so a valid diagram never silently
		// disappears. Only a genuine syntax error reaches the `<pre>` fallback.
		const attempts = [
			vars && { theme: 'base' as const, themeVariables: vars },
			{ theme: dark ? ('dark' as const) : ('default' as const) }
		];
		for (const attempt of attempts) {
			if (!attempt) continue;
			try {
				// Configure and render as one unit so a concurrent diagram can't
				// re-initialize mermaid between the two calls.
				const result = await serialize(() => {
					mermaid.initialize({
						startOnLoad: false,
						securityLevel: 'strict',
						fontFamily: 'inherit',
						...attempt
					});
					return mermaid.render(`${uid}-${(renders += 1)}`, code);
				});
				svg = result.svg;
				failed = false;
				return;
			} catch {
				// Try the next (safer) config.
			}
		}
		// Bad diagram syntax — fall back to source.
		failed = true;
	}

	onMount(() => {
		render();
		// Re-render when the theme toggles so the diagram follows light/dark.
		const observer = new MutationObserver(() => {
			if (document.documentElement.classList.contains('dark') !== lastDark) render();
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	});
</script>

{#if failed}
	<pre class="docsmith-mermaid-fallback not-prose"><code>{code}</code></pre>
{:else if svg}
	<!-- mermaid sanitizes its own output (securityLevel: strict) -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	<figure class="docsmith-mermaid not-prose">{@html svg}</figure>
{:else}
	<!-- Shares the global .docsmith-mermaid-skeleton with the server-rendered
	     placeholder, so swapping to the diagram doesn't change the height. -->
	<div class="docsmith-mermaid-skeleton not-prose" role="status" aria-label="Loading diagram"></div>
{/if}

<style>
	/* The loading skeleton is global (theme.css), shared with the server-rendered
	   placeholder. Here we only style the resolved diagram and the fallback. */
	.docsmith-mermaid {
		margin: 1.5rem 0;
		display: flex;
		justify-content: center;
		animation: docsmith-mermaid-in 0.25s ease-out;
	}
	.docsmith-mermaid :global(svg) {
		max-width: 100%;
		height: auto;
	}
	@keyframes docsmith-mermaid-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.docsmith-mermaid {
			animation: none;
		}
	}

	.docsmith-mermaid-fallback {
		margin: 1.5rem 0;
		padding: 1rem;
		border-radius: var(--radius, 0.75rem);
		border: 1px solid var(--border);
		background: var(--muted);
		overflow-x: auto;
		font-size: 0.85rem;
		line-height: 1.5;
	}
</style>
