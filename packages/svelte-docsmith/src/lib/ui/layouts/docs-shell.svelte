<script lang="ts">
	import { page } from '$app/state';
	import { navFromContent, type DocsContentItem, type DocsmithConfig } from '$lib/config.js';
	import { reactiveToc, tocFromContent, type TocItem } from '$lib/toc/index.js';
	import BackgroundPattern from '../background-pattern.svelte';
	import DocsHeader from './docs-header.svelte';
	import DocsSidebar from './docs-sidebar.svelte';
	import TableOfContents from '../table-of-contents.svelte';
	import { Button } from '$lib/ui/shadcn/button/index.js';
	import * as Popover from '$lib/ui/shadcn/popover/index.js';
	import { ScrollArea } from '$lib/ui/shadcn/scroll-area/index.js';
	import * as Sheet from '$lib/ui/shadcn/sheet/index.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import Menu from '@lucide/svelte/icons/menu';
	import Moon from '@lucide/svelte/icons/moon';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import Sun from '@lucide/svelte/icons/sun';
	import { mode, toggleMode } from 'mode-watcher';
	import type { Snippet } from 'svelte';

	const {
		config,
		content = [],
		children,
		logo,
		actions,
		footer,
		pattern = false
	}: {
		config: DocsmithConfig;
		content?: DocsContentItem[];
		children: Snippet;
		/** Custom logo mark for the header and mobile menu. */
		logo?: Snippet;
		/** Extra header controls (desktop and mobile), before the theme toggle. */
		actions?: Snippet;
		/** Rendered below the content column (copyright, credits, …). */
		footer?: Snippet;
		/** Render the decorative grid-and-glow page background. */
		pattern?: boolean;
	} = $props();

	const nav = $derived(navFromContent(content));

	// Ordered flat page list drives the prev/next links.
	const flatNav = $derived(nav.flatMap((group) => group.items));
	const pageIndex = $derived(flatNav.findIndex((item) => item.url === page.url.pathname));
	const prev = $derived(pageIndex > 0 ? flatNav[pageIndex - 1] : undefined);
	const next = $derived(
		pageIndex >= 0 && pageIndex < flatNav.length - 1 ? flatNav[pageIndex + 1] : undefined
	);
	const currentTitle = $derived(pageIndex >= 0 ? flatNav[pageIndex].title : config.title);

	// Build the in-page TOC from the rendered content after each navigation.
	let contentEl = $state<HTMLElement | null>(null);
	let tocItems = $state<TocItem[]>([]);

	$effect(() => {
		page.url.pathname; // re-run when the route changes
		if (!contentEl) return;
		tocItems = tocFromContent(contentEl);
	});

	const toc = reactiveToc(
		() => tocItems,
		() => contentEl
	);

	let isMobileMenuOpen = $state(false);
	let isTocOpen = $state(false);

	$effect(() => {
		// Close the mobile overlays on navigation.
		page.url.pathname;
		isMobileMenuOpen = false;
		isTocOpen = false;
	});
</script>

<div class="relative isolate flex min-h-screen flex-col">
	{#if pattern}
		<BackgroundPattern />
	{/if}

	<DocsHeader {config} {logo} {actions} />

	<!-- Mobile header -->
	<header
		class="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur lg:hidden"
	>
		<div class="flex h-14 items-center gap-2 px-4">
			<Sheet.Root bind:open={isMobileMenuOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button variant="ghost" size="icon" class="-ml-2" {...props}>
							<Menu class="size-5" />
							<span class="sr-only">Toggle menu</span>
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content side="left" class="pr-0">
					<div class="px-7 pt-4 pb-4">
						<a href="/" class="flex items-center gap-2 font-bold">
							{#if logo}
								{@render logo()}
							{:else}
								<BookOpenText class="text-primary size-5" />
							{/if}
							<span class="inline-block">{config.title}</span>
						</a>
					</div>
					<ScrollArea class="my-4 h-[calc(100vh-8rem)] pb-10 pl-2">
						<DocsSidebar {nav} class="static block h-auto w-full" />
					</ScrollArea>
				</Sheet.Content>
			</Sheet.Root>

			<div class="flex-1 truncate font-bold">{currentTitle}</div>

			<div class="flex items-center gap-1">
				{#if actions}
					{@render actions()}
				{/if}

				<Button
					size="icon"
					variant="ghost"
					onclick={toggleMode}
					class="text-muted-foreground hover:text-foreground size-8"
				>
					{#if mode.current === 'dark'}
						<Sun class="size-4" />
					{:else}
						<Moon class="size-4" />
					{/if}
					<span class="sr-only">Toggle theme</span>
				</Button>

				{#if toc.items.length > 0}
					<Popover.Root bind:open={isTocOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button variant="ghost" size="icon" class="size-8" {...props}>
									<PanelRight class="size-4" />
									<span class="sr-only">Table of contents</span>
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="max-h-[60vh] w-64 overflow-y-auto p-4" align="end">
							<TableOfContents items={toc.items} class="static block w-full" />
						</Popover.Content>
					</Popover.Root>
				{/if}
			</div>
		</div>
	</header>

	<div class="mx-auto flex w-full max-w-7xl flex-1 gap-12 px-4 md:px-6 lg:px-8 lg:pt-10">
		<DocsSidebar {nav} />

		<main bind:this={contentEl} class="min-w-0 flex-1 py-6 lg:py-0">
			{@render children()}

			{#if prev || next}
				<nav class="border-border mt-8 flex justify-between gap-4 border-t pt-8">
					{#if prev}
						<a
							href={prev.url}
							class="border-border hover:border-primary flex min-w-0 flex-1 flex-col gap-1 rounded-lg border p-4 transition-colors"
						>
							<span class="text-muted-foreground text-xs">Previous</span>
							<span class="text-foreground truncate font-medium">{prev.title}</span>
						</a>
					{:else}
						<div class="flex-1"></div>
					{/if}
					{#if next}
						<a
							href={next.url}
							class="border-border hover:border-primary ml-auto flex min-w-0 flex-1 flex-col gap-1 rounded-lg border p-4 text-right transition-colors"
						>
							<span class="text-muted-foreground text-xs">Next</span>
							<span class="text-foreground truncate font-medium">{next.title}</span>
						</a>
					{:else}
						<div class="flex-1"></div>
					{/if}
				</nav>
			{/if}
		</main>

		<TableOfContents items={toc.items} />
	</div>

	{#if footer}
		{@render footer()}
	{/if}
</div>
