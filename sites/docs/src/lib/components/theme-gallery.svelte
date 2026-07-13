<script lang="ts">
	import { mode } from 'mode-watcher';
	import { themes, defaultThemeSlug } from '$lib/themes-data';
	import ThemePicker from './theme-picker.svelte';

	// Scoped preview: applying a theme's tokens to this container cascades into
	// every `bg-primary`/`text-foreground`/… utility inside it, so the preview
	// re-skins without touching the rest of the page.
	let selected = $state(defaultThemeSlug);
	const theme = $derived(themes.find((t) => t.slug === selected) ?? themes[0]);
	const tokens = $derived(mode.current === 'dark' ? theme.dark : theme.light);
	const styleVars = $derived(
		Object.entries(tokens)
			.map(([k, v]) => `--${k}: ${v}`)
			.join('; ')
	);
	const swatches = ['primary', 'accent', 'background', 'card', 'muted', 'border'];
</script>

<div class="not-prose my-6">
	<ThemePicker {themes} active={selected} onselect={(slug) => (selected = slug)} />

	<div class="border-border mt-4 overflow-hidden rounded-xl border">
		<div class="bg-background text-foreground p-6 transition-colors duration-200" style={styleVars}>
			<div class="mb-5 flex flex-wrap gap-3">
				{#each swatches as name (name)}
					<div class="flex flex-col items-center gap-1.5">
						<span class="border-border size-9 rounded-md border" style="background: var(--{name})"
						></span>
						<span class="text-muted-foreground text-[0.65rem]">{name}</span>
					</div>
				{/each}
			</div>

			<div class="bg-card border-border rounded-lg border p-4">
				<h4 class="text-card-foreground font-semibold tracking-tight">{theme.name}</h4>
				<p class="text-muted-foreground mt-1 text-sm">
					The quick brown fox jumps over the lazy dog.
				</p>
				<div class="mt-4 flex flex-wrap items-center gap-2">
					<button
						type="button"
						class="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
					>
						Primary
					</button>
					<button
						type="button"
						class="bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
					>
						Secondary
					</button>
					<span
						class="bg-accent text-accent-foreground rounded-full px-2.5 py-1 text-xs font-medium"
					>
						Badge
					</span>
				</div>
			</div>
		</div>
	</div>

	<p class="text-muted-foreground mt-3 font-mono text-xs">
		@import 'svelte-docsmith/themes/{selected}.css';
	</p>
</div>
