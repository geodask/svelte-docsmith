<script lang="ts">
	import { DocsShell } from 'svelte-docsmith';
	import { mode, toggleMode } from 'mode-watcher';
	import { siteConfig } from '$lib/site-config';
	import { themes, defaultThemeSlug } from '$lib/themes-data';
	import { themeStore } from '$lib/theme-store.svelte';
	import ThemeShowcase from '$lib/components/theme-showcase.svelte';
	import Check from '@lucide/svelte/icons/check';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';

	// Picking a theme applies it to the whole site; the components below (and the
	// chrome around them) re-skin live, so you see the theme in situ.
	const activeSlug = $derived(themeStore.active ?? defaultThemeSlug);
</script>

<svelte:head>
	<title>Themes · Svelte DocSmith</title>
</svelte:head>

<DocsShell config={siteConfig} layout="page" pattern>
	<section class="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8 lg:py-24">
		<div class="max-w-2xl">
			<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Themes</h1>
			<p class="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
				Ten presets ship in the box. Pick one — it applies across the whole site instantly, so the
				components below (and everything else) show the theme in place. Toggle dark mode to see both
				sides. In your own project you pick one with a single CSS import.
			</p>
		</div>

		<!-- Theme picker: applies site-wide -->
		<div class="mt-8 flex flex-wrap gap-2">
			{#each themes as t (t.slug)}
				<button
					onclick={() => themeStore.set(t.slug)}
					class="flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm font-medium transition-colors {activeSlug ===
					t.slug
						? 'border-primary bg-primary/10 text-foreground'
						: 'border-border text-muted-foreground hover:text-foreground'}"
				>
					<span
						class="size-4 rounded-full ring-1 ring-black/10"
						style="background: {t.light.primary}"
					></span>
					{t.name}
					{#if activeSlug === t.slug}<Check class="text-primary size-3.5" />{/if}
				</button>
			{/each}
		</div>

		<!-- Controls -->
		<div class="mt-5 flex flex-wrap items-center gap-3 text-sm">
			<button
				onclick={toggleMode}
				class="border-border text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium transition-colors"
			>
				{#if mode.current === 'dark'}<Sun class="size-3.5" /> Light{:else}<Moon class="size-3.5" />
					Dark{/if}
			</button>
			{#if themeStore.active}
				<button
					onclick={() => themeStore.reset()}
					class="border-border text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium transition-colors"
				>
					<RotateCcw class="size-3.5" /> Reset to default
				</button>
			{/if}
			<span class="text-muted-foreground"
				>Showing <span class="text-foreground font-medium"
					>{themes.find((t) => t.slug === activeSlug)?.name}</span
				></span
			>
		</div>

		<!-- Live components in the applied theme -->
		<div class="mt-6">
			<ThemeShowcase />
		</div>

		<!-- How to use -->
		<div class="border-border mt-14 max-w-2xl border-t pt-10">
			<h2 class="text-2xl font-semibold tracking-tight">Use a theme in your project</h2>
			<p class="text-muted-foreground mt-3 leading-relaxed">
				The picker applies themes at runtime for this demo. In your own site you choose one at build
				time — import its stylesheet after the base contract:
			</p>
			<pre
				class="bg-card border-border mt-4 overflow-x-auto rounded-lg border p-4 font-mono text-sm"><span
					class="text-muted-foreground">@import</span
				> <span class="text-primary">'svelte-docsmith/theme.css'</span>;
<span class="text-muted-foreground">@import</span> <span class="text-primary"
					>'svelte-docsmith/themes/{activeSlug === defaultThemeSlug
						? 'amethyst'
						: activeSlug}.css'</span
				>;</pre>
			<p class="text-muted-foreground mt-4 text-sm">
				See <a
					href="/docs/theming"
					class="text-primary font-medium underline-offset-4 hover:underline">Theming</a
				> for overriding individual tokens and how dark mode is wired.
			</p>
		</div>
	</section>
</DocsShell>
