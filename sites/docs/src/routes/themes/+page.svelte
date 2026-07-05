<script lang="ts">
	import { DocsShell } from 'svelte-docsmith';
	import { mode } from 'mode-watcher';
	import { siteConfig } from '$lib/site-config';
	import { themes, defaultThemeSlug, type Theme } from '$lib/themes-data';
	import { themeStore } from '$lib/theme-store.svelte';
	import Check from '@lucide/svelte/icons/check';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	function styleFor(theme: Theme) {
		const tokens = mode.current === 'dark' ? theme.dark : theme.light;
		return Object.entries(tokens)
			.map(([k, v]) => `--${k}: ${v}`)
			.join('; ');
	}

	const activeName = $derived(
		themes.find((t) => t.slug === themeStore.active)?.name ?? 'Tangerine (default)'
	);
	const swatches = ['primary', 'accent', 'background', 'muted', 'border'];
</script>

<svelte:head>
	<title>Themes · Svelte DocSmith</title>
</svelte:head>

<DocsShell config={siteConfig} layout="page" pattern>
	<section class="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8 lg:py-24">
		<div class="max-w-2xl">
			<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Themes</h1>
			<p class="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
				Six presets ship in the box, each covering light and dark. Hit <strong
					class="text-foreground font-medium">Apply to site</strong
				>
				to try one across this entire site — toggle dark mode any time to see both. It's a live preview;
				in your own project you pick one with a single import.
			</p>

			<div class="mt-6 flex flex-wrap items-center gap-3 text-sm">
				<span class="text-muted-foreground"
					>Active: <span class="text-foreground font-medium">{activeName}</span></span
				>
				{#if themeStore.active}
					<button
						onclick={() => themeStore.reset()}
						class="border-border text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium transition-colors"
					>
						<RotateCcw class="size-3.5" />
						Reset to default
					</button>
				{/if}
			</div>
		</div>

		<div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each themes as t (t.slug)}
				{@const isActive =
					themeStore.active === t.slug ||
					(themeStore.active === null && t.slug === defaultThemeSlug)}
				<div
					class="border-border bg-card overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md {isActive
						? 'ring-primary/40 ring-2'
						: ''}"
				>
					<!-- Preview rendered in the theme's own tokens -->
					<div class="bg-background p-5" style={styleFor(t)}>
						<div class="mb-4 flex gap-1.5">
							{#each swatches as name (name)}
								<span
									class="border-border h-7 flex-1 rounded-md border"
									style="background: var(--{name})"
								></span>
							{/each}
						</div>
						<div class="bg-card border-border rounded-lg border p-3.5">
							<p class="text-card-foreground text-sm font-semibold">Aa The quick brown fox</p>
							<p class="text-muted-foreground mt-0.5 text-xs">Body copy in the muted tone.</p>
							<div class="mt-3 flex items-center gap-2">
								<span
									class="bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs font-medium"
									>Primary</span
								>
								<span
									class="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[0.7rem] font-medium"
									>Badge</span
								>
							</div>
						</div>
					</div>

					<!-- Card footer: name + apply -->
					<div class="border-border flex items-center justify-between gap-3 border-t p-4">
						<div class="min-w-0">
							<p class="font-semibold">{t.name}</p>
							<p class="text-muted-foreground truncate font-mono text-xs">themes/{t.slug}.css</p>
						</div>
						<button
							onclick={() => themeStore.set(t.slug)}
							disabled={themeStore.active === t.slug}
							class="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {themeStore.active ===
							t.slug
								? 'bg-primary/10 text-primary'
								: 'bg-primary text-primary-foreground hover:bg-primary/90'}"
						>
							{#if themeStore.active === t.slug}
								<Check class="size-4" /> Applied
							{:else}
								Apply to site
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- How to use in a real project -->
		<div class="border-border mt-16 max-w-2xl border-t pt-10">
			<h2 class="text-2xl font-semibold tracking-tight">Use a theme in your project</h2>
			<p class="text-muted-foreground mt-3 leading-relaxed">
				The switcher above swaps themes at runtime just to preview them. In your own site you pick
				one at build time — import its stylesheet after the base contract:
			</p>
			<pre
				class="bg-card border-border mt-4 overflow-x-auto rounded-lg border p-4 font-mono text-sm"><span
					class="text-muted-foreground">@import</span
				> <span class="text-primary">'tailwindcss'</span>;
<span class="text-muted-foreground">@import</span> <span class="text-primary"
					>'svelte-docsmith/theme.css'</span
				>;
<span class="text-muted-foreground">@import</span> <span class="text-primary"
					>'svelte-docsmith/themes/{themeStore.active ?? 'amethyst'}.css'</span
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
