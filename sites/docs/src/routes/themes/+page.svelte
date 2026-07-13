<script lang="ts">
	import { DocsShell } from 'svelte-docsmith';
	import { mode, toggleMode } from 'mode-watcher';
	import { siteConfig } from '$lib/site-config';
	import { themes, defaultThemeSlug } from '$lib/themes-data';
	import { themeStore } from '$lib/theme-store.svelte';
	import ThemePicker from '$lib/components/theme-picker.svelte';
	import ThemeShowcase from '$lib/components/theme-showcase.svelte';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';

	// Picking a theme applies it to the whole site; the components below (and the
	// chrome around them) re-skin live, so you see the theme in situ.
	const activeSlug = $derived(themeStore.active ?? defaultThemeSlug);
	const activeName = $derived(themes.find((t) => t.slug === activeSlug)?.name ?? '');
	const isDefault = $derived(activeSlug === defaultThemeSlug);

	// The exact import a consumer writes for the current selection. Darkmatter is
	// the baked-in default, so it needs no preset line.
	const importSnippet = $derived(
		isDefault
			? "@import 'svelte-docsmith/theme.css';"
			: `@import 'svelte-docsmith/theme.css';\n@import 'svelte-docsmith/themes/${activeSlug}.css';`
	);
</script>

<DocsShell
	config={siteConfig}
	layout="page"
	pattern
	seo={{
		title: 'Themes',
		description: 'Preview and switch between the built-in Svelte DocSmith themes.'
	}}
>
	<section class="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8 lg:py-24">
		<div class="max-w-2xl">
			<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Themes</h1>
			<p class="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
				Eleven presets ship in the box. Pick one and it applies across the whole site instantly, so
				every component and the chrome around it show the theme exactly as it renders in a real
				project. Toggle dark mode to see both sides.
			</p>
		</div>

		<!-- Picker + controls -->
		<div class="mt-8 flex flex-col gap-4">
			<ThemePicker {themes} active={activeSlug} onselect={(slug) => themeStore.set(slug)} />

			<div class="flex flex-wrap items-center gap-3 text-sm">
				<button
					type="button"
					onclick={toggleMode}
					aria-label="Toggle dark mode"
					class="border-border text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium transition-colors outline-none focus-visible:ring-2"
				>
					{#if mode.current === 'dark'}
						<Sun class="size-3.5" aria-hidden="true" /> Light
					{:else}
						<Moon class="size-3.5" aria-hidden="true" /> Dark
					{/if}
				</button>

				{#if themeStore.active}
					<button
						type="button"
						onclick={() => themeStore.reset()}
						class="border-border text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium transition-colors outline-none focus-visible:ring-2"
					>
						<RotateCcw class="size-3.5" aria-hidden="true" /> Reset to default
					</button>
				{/if}

				<span class="text-muted-foreground">
					Showing <span class="text-foreground font-medium">{activeName}</span>
					{#if isDefault}<span class="text-muted-foreground/80">(default)</span>{/if}
				</span>
			</div>
		</div>

		<!-- Live components in the applied theme -->
		<div class="mt-8">
			<ThemeShowcase />
		</div>

		<!-- How to use -->
		<div class="border-border mt-16 max-w-2xl border-t pt-10">
			<h2 class="text-2xl font-semibold tracking-tight">Use this theme in your project</h2>
			<p class="text-muted-foreground mt-3 leading-relaxed">
				The picker applies themes at runtime for this demo. In your own site you choose one at build
				time with a single stylesheet import:
			</p>
			<pre
				class="bg-card text-foreground border-border mt-4 overflow-x-auto rounded-lg border p-4 font-mono text-sm leading-relaxed"><code
					>{importSnippet}</code
				></pre>
			<p class="text-muted-foreground mt-4 text-sm">
				See <a
					href="/docs/theming"
					class="text-primary font-medium underline-offset-4 hover:underline">Theming</a
				> for overriding individual tokens and how dark mode is wired.
			</p>
		</div>
	</section>
</DocsShell>
