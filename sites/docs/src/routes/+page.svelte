<script lang="ts">
	import {
		DocsShell,
		LiveExample,
		Hero,
		FeatureGrid,
		Feature,
		CTA,
		Action
	} from 'svelte-docsmith';
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
			/* clipboard unavailable, no-op */
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
			body: 'Header, collapsible sidebar, and mobile nav: the whole chrome, out of the box.'
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

	// Real docs destinations for the nav fold — same visual language as DocsSidebar
	// (sentence-case group titles, primary active state), not a marketing mock.
	const navGroups = [
		{
			group: 'Getting Started',
			items: [
				{ title: 'Introduction', href: '/docs/introduction' },
				{ title: 'Installation', href: '/docs/installation' },
				{ title: 'Quick Start', href: '/docs/quick-start' },
				{ title: 'Configuration', href: '/docs/configuration' }
			],
			active: 'Quick Start'
		},
		{
			group: 'Core Concepts',
			items: [
				{ title: 'How it works', href: '/docs/concepts' },
				{ title: 'Writing pages', href: '/docs/writing-pages' },
				{ title: 'Live Examples', href: '/docs/live-examples' },
				{ title: 'Theming', href: '/docs/theming' },
				{ title: 'Search', href: '/docs/search' },
				{ title: 'SEO', href: '/docs/seo' }
			],
			active: ''
		}
	];
</script>

<DocsShell
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	config={siteConfig}
	layout="page"
	pattern
>
	<!-- ─────────────────────────── Hero ─────────────────────────── -->
	<div use:reveal>
		<Hero>
			{#snippet eyebrow()}
				<a
					href="/docs/introduction"
					class="border-border/70 bg-muted/40 text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs font-medium transition-colors"
				>
					<span
						class="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[0.7rem] font-semibold"
						>New</span
					>
					Built with Svelte 5 + SvelteKit
					<ArrowRight class="size-3" />
				</a>
			{/snippet}

			{#snippet title()}
				Craft documentation worthy of <span class="text-primary">legend</span>.
			{/snippet}

			{#snippet description()}
				A documentation framework for Svelte. Your interactive examples live inside one real,
				stateful app, not screenshots, not sandboxed islands. Markdown compiles to real routes, and
				the sidebar builds itself.
			{/snippet}

			{#snippet actions()}
				<Action href="/docs/quick-start">Start smithing</Action>
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
			{/snippet}

			{#snippet media()}
				<CodeWindow filename="hero-demo.svelte" source={heroSource} renderedLabel="Live">
					{#snippet rendered()}
						<HeroDemo />
					{/snippet}
				</CodeWindow>
				<p class="text-muted-foreground mt-3 text-center text-sm">
					Real component, real state: the button above is running, not a picture of one.
				</p>
			{/snippet}
		</Hero>
	</div>

	<!-- ──────────────────── Feature: examples are real ──────────────────── -->
	<section class="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8 lg:py-24">
		<div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
			<div use:reveal>
				<p class="text-primary font-mono text-sm font-medium">Show, don't tell</p>
				<h2 class="font-serif mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
					Living examples, not screenshots
				</h2>
				<p class="text-foreground mt-4 text-lg leading-relaxed text-pretty">
					Drop a Svelte component straight into your markdown and it runs as part of the same app.
					The rendered demo and its syntax-highlighted source come from one file, imported twice, so
					the code you show and the code that runs can never drift.
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
					<h2 class="font-serif mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
						Markdown, hammered into routes
					</h2>
					<p class="text-foreground mt-4 text-lg leading-relaxed text-pretty">
						DocSmith leans on mdsvex, which turns markdown into real Svelte components. A file at
						<span class="text-foreground font-mono text-sm">docs/quick-start/+page.md</span>
						becomes the page
						<span class="text-foreground font-mono text-sm">/docs/quick-start</span>. No catch-all
						route, no content loader, no collection config to maintain.
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
				<h2 class="font-serif mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
					The sidebar builds itself
				</h2>
				<p class="text-foreground mt-4 text-lg leading-relaxed text-pretty">
					There is no navigation array to maintain. A Vite plugin reads each page's frontmatter at
					build time; <span class="text-foreground font-mono text-sm">section</span> names the group
					and <span class="text-foreground font-mono text-sm">order</span> sorts it. Add a page, and
					it appears in the sidebar automatically, in the right place.
				</p>
			</div>

			<div use:reveal={{ delay: 100 }}>
				<!-- Matches DocsSidebar visual language so the product and the proof agree. -->
				<div class="border-border bg-card rounded-xl border p-4 shadow-sm">
					<nav aria-label="Sidebar preview" class="space-y-6 p-2">
						{#each navGroups as section (section.group)}
							<div class="space-y-3">
								<p class="text-foreground px-2 text-sm font-semibold">{section.group}</p>
								<ul class="space-y-1">
									{#each section.items as item (item.href)}
										<li>
											<a
												href={item.href}
												class="block rounded-md px-2 py-1.5 text-sm transition-colors {item.title ===
												section.active
													? 'text-primary bg-primary/20 font-medium'
													: 'text-muted-foreground hover:text-primary hover:bg-primary/20'}"
											>
												{item.title}
											</a>
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</nav>
				</div>
			</div>
		</div>
	</section>

	<!-- ──────────────────── Batteries included ──────────────────── -->
	<div use:reveal>
		<FeatureGrid
			background="muted"
			title="Everything a docs site needs, ready off the anvil"
			description="You bring the words. DocSmith brings the pipeline, the layout, and the chrome."
		>
			{#each batteries as feature (feature.title)}
				<Feature title={feature.title}>
					{#snippet icon()}
						<feature.icon class="size-5" />
					{/snippet}
					{feature.body}
				</Feature>
			{/each}
		</FeatureGrid>
	</div>

	<!-- ──────────────────── Closing CTA ──────────────────── -->
	<div use:reveal>
		<CTA
			title="Docs, wrought to run"
			description="Install the package, wire up the pipeline in three lines, and shape your first page."
		>
			{#snippet before()}
				<!-- Pre-1.0 note above the headline so the section still ends on action. -->
				<EarlyReleaseAlert />
			{/snippet}
			{#snippet actions()}
				<Action href="/docs/quick-start">Light the forge</Action>
				{#if siteConfig.github}
					<Action href={siteConfig.github} variant="secondary" external arrow={false}>
						<svg viewBox="0 0 24 24" fill="currentColor" class="size-4" aria-hidden="true">
							<path
								d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
							/>
						</svg>
						Star on GitHub
					</Action>
				{/if}
			{/snippet}
		</CTA>
	</div>
</DocsShell>
