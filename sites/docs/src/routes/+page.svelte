<script lang="ts">
	import { DocsShell, LiveExample } from 'svelte-docsmith';
	import { siteConfig } from '$lib/site-config';
	import CodeWindow from '$lib/components/landing/code-window.svelte';
	import EarlyReleaseAlert from '$lib/components/early-release-alert.svelte';
	import { reveal } from '$lib/actions/reveal';

	import HeroDemo from '$lib/examples/hero-demo.svelte';
	import Counter from '$lib/examples/counter.svelte';
	import { heroSource, counterSource } from '$lib/examples/sources';

	import Zap from '@lucide/svelte/icons/zap';
	import Moon from '@lucide/svelte/icons/moon';
	import ListTree from '@lucide/svelte/icons/list-tree';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Copy from '@lucide/svelte/icons/copy';
	import Palette from '@lucide/svelte/icons/palette';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';

	const installCmd = 'npm i -D svelte-docsmith';

	let copied = $state(false);
	async function copyInstall() {
		try {
			await navigator.clipboard.writeText(installCmd);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			/* clipboard unavailable — no-op */
		}
	}

	const batteries = [
		{
			icon: Zap,
			title: 'Shiki highlighting',
			body: 'A generous language set, dual light/dark themes, run on the HAST tree at build time.'
		},
		{
			icon: Moon,
			title: 'First-class dark mode',
			body: 'Every component and code block flips with the theme. Not an afterthought.'
		},
		{
			icon: ListTree,
			title: 'Table of contents',
			body: 'The in-page TOC scans your rendered headings and tracks what you are reading.'
		},
		{
			icon: Smartphone,
			title: 'Responsive shell',
			body: 'Header, collapsible sidebar, and mobile nav — the whole chrome, out of the box.'
		},
		{
			icon: Copy,
			title: 'Anchors & copy buttons',
			body: 'Linkable headings and one-click copy on every code block, wired up for you.'
		},
		{
			icon: Palette,
			title: 'Themeable',
			body: 'One CSS import ships the token system. Swap in a preset or override any token.'
		}
	];

	const navGroups = [
		{
			group: 'Getting Started',
			items: ['Introduction', 'Installation', 'Quick Start'],
			active: 'Quick Start'
		},
		{
			group: 'Core Concepts',
			items: ['How it works', 'Writing pages', 'Live Examples', 'Theming'],
			active: ''
		},
		{ group: 'Reference', items: ['API Reference'], active: '' }
	];
</script>

<DocsShell config={siteConfig} layout="page" pattern>
	<!-- ─────────────────────────── Hero ─────────────────────────── -->
	<section
		class="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-16 pb-20 md:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8 lg:pt-24 lg:pb-28"
	>
		<div use:reveal class="min-w-0">
			<a
				href="/docs/introduction"
				class="border-border/70 bg-muted/40 text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs font-medium transition-colors"
			>
				<span
					class="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[0.7rem] font-semibold"
					>New</span
				>
				Docs powered by Svelte 5 + SvelteKit
				<ArrowRight class="size-3" />
			</a>

			<h1
				class="mt-6 text-5xl font-semibold tracking-[-0.03em] text-balance sm:text-6xl lg:text-[4.25rem] lg:leading-[1.02]"
			>
				Docs that <span class="text-primary">run</span>.
			</h1>

			<p class="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed text-pretty">
				A documentation framework for Svelte. Your interactive examples live inside one real,
				stateful app — not screenshots, not sandboxed islands. Markdown compiles to real routes, and
				the sidebar builds itself.
			</p>

			<div class="mt-8 flex flex-wrap items-center gap-3">
				<a
					href="/docs/quick-start"
					class="group bg-primary text-primary-foreground inline-flex h-11 items-center gap-2 rounded-lg px-6 font-medium shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
				>
					Get started
					<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
				</a>

				<button
					onclick={copyInstall}
					class="border-border bg-card text-muted-foreground hover:text-foreground inline-flex h-11 items-center gap-3 rounded-lg border px-4 font-mono text-sm transition-colors"
				>
					<span class="text-primary/70 select-none">$</span>
					{installCmd}
					{#if copied}
						<Check class="text-primary size-4" />
					{:else}
						<Copy class="size-4 opacity-60" />
					{/if}
				</button>
			</div>
		</div>

		<div use:reveal={{ delay: 120 }} class="min-w-0">
			<CodeWindow filename="hero-demo.svelte" source={heroSource} renderedLabel="Live">
				{#snippet rendered()}
					<HeroDemo />
				{/snippet}
			</CodeWindow>
			<p class="text-muted-foreground mt-3 text-center text-sm">
				Real component, real state — the button above is running, not a picture of one.
			</p>
		</div>
	</section>

	<!-- ──────────────────── Feature: examples are real ──────────────────── -->
	<section class="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8 lg:py-24">
		<div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
			<div use:reveal>
				<p class="text-primary font-mono text-sm font-medium">Show, don't tell</p>
				<h2 class="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
					Your examples are real components
				</h2>
				<p class="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
					Drop a Svelte component straight into your markdown and it runs as part of the same app.
					The rendered demo and its syntax-highlighted source come from one file, imported twice —
					so the code you show and the code that runs can never drift.
				</p>
				<a
					href="/docs/live-examples"
					class="text-primary mt-6 inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
				>
					See live examples <ArrowRight class="size-4" />
				</a>
			</div>

			<div use:reveal={{ delay: 100 }} class="not-prose">
				<LiveExample source={counterSource}>
					<Counter />
				</LiveExample>
			</div>
		</div>
	</section>

	<!-- ──────────────────── Feature: markdown is routes ──────────────────── -->
	<section class="border-border/50 bg-muted/20 border-y">
		<div class="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8 lg:py-24">
			<div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
				<div use:reveal={{ delay: 100 }} class="order-2 lg:order-1">
					<CodeWindow filename="src/routes/docs/quick-start/+page.md">
						<pre class="overflow-x-auto px-5 py-4"><span class="text-muted-foreground">---</span>
<span class="text-muted-foreground">title:</span> <span class="text-foreground">Quick Start</span>
<span class="text-muted-foreground">section:</span> <span class="text-foreground"
								>Getting Started</span
							>
<span class="text-muted-foreground">order:</span> <span class="text-foreground">3</span>
<span class="text-muted-foreground">---</span>

<span class="text-primary">## Register the pipeline</span>

Drop a <span class="text-foreground">`.md`</span> file under <span class="text-foreground"
								>src/routes/docs/</span
							>
and it becomes a real route.</pre>
					</CodeWindow>

					<div
						class="text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-3 font-mono text-sm"
					>
						<span class="bg-card ring-border rounded-md px-2.5 py-1 ring-1"
							>…/quick-start/+page.md</span
						>
						<ArrowRight class="text-primary size-4 shrink-0" />
						<span class="bg-primary/10 text-primary rounded-md px-2.5 py-1 font-medium"
							>/docs/quick-start</span
						>
					</div>
				</div>

				<div use:reveal class="order-1 lg:order-2">
					<p class="text-primary font-mono text-sm font-medium">No loaders, no config</p>
					<h2 class="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
						Markdown compiles to real routes
					</h2>
					<p class="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
						DocSmith leans on mdsvex, which turns markdown into real Svelte components. A file at
						<span class="text-foreground font-mono text-sm">docs/quick-start/+page.md</span>
						becomes the page
						<span class="text-foreground font-mono text-sm">/docs/quick-start</span> — no catch-all route,
						no content loader, no collection config to maintain.
					</p>
					<a
						href="/docs/concepts"
						class="text-primary mt-6 inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
					>
						How it works <ArrowRight class="size-4" />
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- ──────────────────── Feature: nav derives itself ──────────────────── -->
	<section class="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8 lg:py-24">
		<div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
			<div use:reveal>
				<p class="text-primary font-mono text-sm font-medium">Nav is derived, never written</p>
				<h2 class="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
					The sidebar builds itself
				</h2>
				<p class="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
					There is no navigation array to maintain. A Vite plugin reads each page's frontmatter at
					build time; <span class="text-foreground font-mono text-sm">section</span> names the group
					and <span class="text-foreground font-mono text-sm">order</span> sorts it. Add a page, and
					it appears in the sidebar — automatically, in the right place.
				</p>
			</div>

			<div use:reveal={{ delay: 100 }}>
				<div class="border-border bg-card rounded-xl border p-4 shadow-sm">
					<div class="space-y-5 p-2">
						{#each navGroups as section (section.group)}
							<div>
								<p
									class="text-muted-foreground/70 mb-2 px-3 text-xs font-semibold tracking-wide uppercase"
								>
									{section.group}
								</p>
								<ul class="space-y-0.5">
									{#each section.items as item (item)}
										<li>
											<span
												class="block rounded-md px-3 py-1.5 text-sm {item === section.active
													? 'bg-primary/10 text-primary font-medium'
													: 'text-muted-foreground'}"
											>
												{item}
											</span>
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ──────────────────── Batteries included ──────────────────── -->
	<section class="border-border/50 bg-muted/20 border-t">
		<div class="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8 lg:py-24">
			<div class="mx-auto max-w-2xl text-center" use:reveal>
				<h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
					Everything a docs site needs, wired up
				</h2>
				<p class="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
					You bring the content. DocSmith brings the pipeline, the layout, and the chrome.
				</p>
			</div>

			<div class="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" use:reveal>
				{#each batteries as feature (feature.title)}
					<div class="flex gap-4">
						<div
							class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg"
						>
							<feature.icon class="size-5" />
						</div>
						<div>
							<h3 class="font-semibold">{feature.title}</h3>
							<p class="text-muted-foreground mt-1 text-sm leading-relaxed">{feature.body}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ──────────────────── Closing CTA ──────────────────── -->
	<section class="mx-auto max-w-7xl px-4 py-20 md:px-6 lg:px-8 lg:py-28">
		<div
			class="border-border bg-card relative isolate overflow-hidden rounded-2xl border px-6 py-16 text-center shadow-sm md:px-12"
			use:reveal
		>
			<div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
				<div
					class="bg-primary/15 absolute top-0 left-1/2 h-75 w-150 -translate-x-1/2 rounded-full opacity-50 blur-[100px]"
				></div>
			</div>

			<h2 class="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
				Ship documentation that runs
			</h2>
			<p class="text-muted-foreground mx-auto mt-4 max-w-xl text-lg leading-relaxed text-pretty">
				Install the package, wire up the pipeline in three lines, and write your first page.
			</p>

			<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
				<a
					href="/docs/quick-start"
					class="group bg-primary text-primary-foreground inline-flex h-11 items-center gap-2 rounded-lg px-6 font-medium shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
				>
					Get started
					<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
				</a>
				<a
					href={siteConfig.github}
					target="_blank"
					rel="noopener noreferrer"
					class="border-border bg-background hover:bg-accent inline-flex h-11 items-center gap-2 rounded-lg border px-6 font-medium transition-colors"
				>
					<svg viewBox="0 0 24 24" fill="currentColor" class="size-4" aria-hidden="true">
						<path
							d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
						/>
					</svg>
					Star on GitHub
				</a>
			</div>

			<div class="mx-auto mt-10 max-w-xl text-left">
				<EarlyReleaseAlert />
			</div>
		</div>
	</section>
</DocsShell>
