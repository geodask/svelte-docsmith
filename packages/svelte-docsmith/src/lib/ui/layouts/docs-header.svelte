<script lang="ts">
	import { Badge } from '$lib/ui/shadcn/badge/index.js';
	import { Button } from '$lib/ui/shadcn/button/index.js';
	import { Separator } from '$lib/ui/shadcn/separator/index.js';
	import GithubIcon from '$lib/ui/icons/github.svelte';
	import SearchTrigger from '../search-trigger.svelte';
	import ThemeToggle from '../theme-toggle.svelte';
	import type { DocsmithConfig } from '$lib/config.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import type { Snippet } from 'svelte';

	const {
		config,
		logo,
		actions
	}: {
		config: DocsmithConfig;
		/** Custom logo mark; defaults to a book icon in a primary-tinted chip. */
		logo?: Snippet;
		/** Extra header controls, rendered before the theme toggle. */
		actions?: Snippet;
	} = $props();

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
				{#if logo}
					{@render logo()}
				{:else if config.logo}
					<img src={config.logo} alt="" class="size-5 object-contain" />
				{:else}
					<BookOpenText class="size-5" />
				{/if}
			</div>
			<span class="text-base font-semibold tracking-tight md:text-lg">{config.title}</span>
		</a>

		<div class="ml-auto flex items-center gap-2">
			{#if config.nav?.length}
				<nav class="mr-1 flex items-center gap-1">
					{#each config.nav as link (link.href)}
						<a
							href={link.href}
							target={link.external ? '_blank' : undefined}
							rel={link.external ? 'noopener noreferrer' : undefined}
							class="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
						>
							{link.label}
						</a>
					{/each}
				</nav>
			{/if}

			{#if config.version}
				<div class="px-2">
					<Badge
						variant="outline"
						class="bg-muted/50 border-border/50 font-mono text-xs font-normal"
					>
						v{config.version}
					</Badge>
				</div>
			{/if}

			<SearchTrigger />

			<Separator orientation="vertical" class="bg-border/40 mx-1 min-h-0 h-6" />

			<div class="flex items-center gap-0.5">
				{#if actions}
					{@render actions()}
				{/if}

				{#if config.github}
					<Button
						size="icon"
						variant="ghost"
						target="_blank"
						href={config.github}
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
