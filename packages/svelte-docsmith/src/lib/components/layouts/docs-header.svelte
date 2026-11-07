<script lang="ts">
	import { Badge } from '#lib/components/shadcn/badge/index.js';
	import { Button } from '#lib/components/shadcn/button/index.js';
	import { Separator } from '#lib/components/shadcn/separator/index.js';
	import GithubIcon from '#lib/components/icons/github.svelte';
	import SearchTrigger from '../chrome/search-trigger.svelte';
	import { useSearchSession } from '#lib/search/session.svelte.js';
	import ThemeToggle from '../chrome/theme-toggle.svelte';
	import VersionSwitcher from '../chrome/version-switcher.svelte';
	import { outside, site } from 'svelte-docsmith/site';
	import type { Snippet } from 'svelte';
	import { siteLinkRel } from '#lib/core/outside-path.js';
	import { cn } from '#lib/utils/cn.js';
	import { useDocsPage } from '../docs-page-context.js';
	import SiteMark from './site-mark.svelte';

	const {
		logo,
		actions
	}: {
		/** Custom logo mark; defaults to `site.logo`, then a book icon, in a primary-tinted chip. */
		logo?: Snippet;
		/** Extra header controls, rendered before the theme toggle. */
		actions?: Snippet;
	} = $props();

	// Present only when the consumer passed a `search` loader to DocsShell.
	const search = useSearchSession();

	// The header links, and which one is current, come off the shell's one
	// resolved view, so this header and the mobile one can't disagree.
	const docsPage = useDocsPage();

	let isScrolled = $state(false);
</script>

<svelte:window onscroll={() => (isScrolled = window.scrollY > 50)} />

<header
	class="sticky top-0 z-40 hidden w-full transition-all duration-200 lg:block {isScrolled
		? 'bg-background/60 supports-backdrop-filter:bg-background/60 border-border/40 border-b backdrop-blur-xl'
		: 'border-transparent bg-transparent'}"
>
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
		<a href="/" class="group flex items-center gap-2.5">
			<div
				class="bg-primary/10 text-primary group-hover:bg-primary/20 flex size-8 items-center justify-center rounded-lg transition-all duration-200"
			>
				<SiteMark {logo} />
			</div>
			<span class="text-base font-semibold tracking-tight md:text-lg">{site.title}</span>
		</a>

		<div class="ml-auto flex items-center gap-2">
			{#if docsPage.view.headerLinks.length}
				<nav aria-label="Main" class="mr-1 flex items-center gap-1">
					{#each docsPage.view.headerLinks as link, i (i)}
						<a
							href={link.href}
							target={link.external ? '_blank' : undefined}
							rel={siteLinkRel(link, outside)}
							aria-current={link.active ? 'page' : undefined}
							class={cn(
								'hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
								link.active ? 'text-foreground bg-muted/60' : 'text-muted-foreground'
							)}
						>
							{link.label}
						</a>
					{/each}
				</nav>
			{/if}

			{#if docsPage.view.versionLinks.length > 1}
				<div class="px-1">
					<VersionSwitcher links={docsPage.view.versionLinks} />
				</div>
			{:else if site.version}
				<div class="px-2">
					<Badge
						variant="outline"
						class="bg-muted/50 border-border/50 font-mono text-xs font-normal"
					>
						v{site.version}
					</Badge>
				</div>
			{/if}

			<SearchTrigger />

			<!-- The separator divides the search trigger from the action icons, so
			     it only earns its place when there is a trigger to divide from.
			     Without this a site that hasn't wired search shows a stray rule. -->
			{#if search}
				<Separator orientation="vertical" class="bg-border/40 mx-1 min-h-0 h-6" />
			{/if}

			<div class="flex items-center gap-0.5">
				{#if actions}
					{@render actions()}
				{/if}

				{#if site.github}
					<Button
						size="icon"
						variant="ghost"
						target="_blank"
						rel="noopener noreferrer"
						href={site.github}
						class="text-muted-foreground hover:text-foreground size-8"
					>
						<GithubIcon class="size-4" />
						<span class="sr-only">GitHub</span>
					</Button>
				{/if}

				<ThemeToggle />
			</div>
		</div>
	</div>
</header>
