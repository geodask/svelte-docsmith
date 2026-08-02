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

	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';

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

	// Three concrete pipeline claims — no Lucide grid. The three product-proof
	// folds above already carry the differentiators; this band only names the rest.
	const alsoShips = [
		{
			title: 'Shiki at build time',
			body: 'A generous language set and dual light/dark themes on the HAST tree, not a client highlighter.'
		},
		{
			title: 'Search, llms.txt, sitemap',
			body: 'A command palette, AI-readable indexes, and SEO tags from the same content scan.'
		},
		{
			title: 'Themes and dark mode',
			body: 'One CSS import ships the token system. Eleven presets, both schemes, first-class.'
		}
	];

	// Real docs destinations for the nav fold — same visual language as DocsSidebar.
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
					href="/docs/live-examples"
					class="border-border/70 bg-muted/40 text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs font-medium transition-colors"
				>
					<span
						class="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[0.7rem] font-semibold"
						>Live</span
					>
					Examples in one real app, not iframes
					<ArrowRight class="size-3" />
				</a>
			{/snippet}

			{#snippet title()}
				Docs worthy of <span class="text-primary">legend</span>.
			{/snippet}

			{#snippet description()}
				A documentation framework for Svelte. Interactive examples live inside one real, stateful
				app: not screenshots, not sandboxed islands. Markdown compiles to real routes, the sidebar
				builds itself, and a scaffolded site is minutes away.
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
				<h2 class="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
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
					<h2 class="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
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
				<h2 class="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
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
													: 'text-muted-foreground hover:text-primary hover:bg-primary/10'}"
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

	<!-- ──────────────────── Also ships ──────────────────── -->
	<div use:reveal>
		<FeatureGrid
			background="muted"
			columns={3}
			title="Also on the anvil"
			description="The three proofs above are the product. These ship with them."
		>
			{#each alsoShips as feature (feature.title)}
				<Feature title={feature.title}>{feature.body}</Feature>
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
				<EarlyReleaseAlert />
			{/snippet}
			{#snippet actions()}
				<Action href="/docs/quick-start">Light the forge</Action>
				<Action href="/docs/introduction" variant="secondary" arrow={false}>Read the docs</Action>
			{/snippet}
		</CTA>
	</div>
</DocsShell>
