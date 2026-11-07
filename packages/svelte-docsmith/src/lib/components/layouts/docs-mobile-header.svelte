<script lang="ts">
	import { page } from '$app/state';
	import { site } from 'svelte-docsmith/site';
	import type { TocItem } from '#lib/toc/index.js';
	import DocsSidebar from './docs-sidebar.svelte';
	import TableOfContents from '../chrome/table-of-contents.svelte';
	import ThemeToggle from '../chrome/theme-toggle.svelte';
	import VersionSwitcher from '../chrome/version-switcher.svelte';
	import { Button } from '#lib/components/shadcn/button/index.js';
	import * as Popover from '#lib/components/shadcn/popover/index.js';
	import { ScrollArea } from '#lib/components/shadcn/scroll-area/index.js';
	import { Separator } from '#lib/components/shadcn/separator/index.js';
	import * as Sheet from '#lib/components/shadcn/sheet/index.js';
	import { useSearchSession } from '#lib/search/session.svelte.js';
	import { useDocsPage } from '../docs-page-context.js';
	import GithubIcon from '#lib/components/icons/github.svelte';
	import SiteMark from './site-mark.svelte';
	import List from '@lucide/svelte/icons/list';
	import Menu from '@lucide/svelte/icons/menu';
	import SearchIcon from '@lucide/svelte/icons/search';
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils/cn.js';

	const {
		sidebar = false,
		tocItems = [],
		tocActiveId = null,
		logo,
		actions
	}: {
		/** Show the docs sidebar in the menu; off on non-doc pages (the `page` layout). */
		sidebar?: boolean;
		/** In-page TOC entries; the TOC popover is hidden when empty. */
		tocItems?: TocItem[];
		/** Id of the heading currently in view. */
		tocActiveId?: string | null;
		logo?: Snippet;
		actions?: Snippet;
	} = $props();

	const search = useSearchSession();
	// The header links, the sidebar and the title come off the shell's one
	// resolved view, the same one the desktop header reads.
	const docsPage = useDocsPage();
	const nav = $derived(sidebar ? docsPage.view.nav : []);

	let isMenuOpen = $state(false);
	let isTocOpen = $state(false);

	$effect(() => {
		// Close the overlays on navigation.
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- read to make the route a reactive dependency
		page.url.pathname;
		isMenuOpen = false;
		isTocOpen = false;
	});
</script>

<header
	class="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur lg:hidden"
>
	<div class="flex h-14 items-center gap-2 px-4">
		<Sheet.Root bind:open={isMenuOpen}>
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
						<SiteMark {logo} class="text-primary" />
						<span class="inline-block">{site.title}</span>
					</a>
				</div>
				{#if docsPage.view.versionLinks.length > 1}
					<div class="px-7 pb-3">
						<VersionSwitcher links={docsPage.view.versionLinks} />
					</div>
				{/if}
				<ScrollArea class="my-4 h-[calc(100vh-8rem)] pb-10 pl-2">
					{#if docsPage.view.headerLinks.length}
						<nav aria-label="Main" class="flex flex-col gap-0.5 px-5 pb-1">
							{#each docsPage.view.headerLinks as link (link.href)}
								<a
									href={link.href}
									target={link.external ? '_blank' : undefined}
									rel={link.external ? 'noopener noreferrer' : undefined}
									aria-current={link.active ? 'page' : undefined}
									class={cn(
										'hover:text-foreground rounded-md py-1.5 text-sm font-medium transition-colors',
										link.active ? 'text-foreground' : 'text-muted-foreground'
									)}
								>
									{link.label}
								</a>
							{/each}
						</nav>
						{#if nav.length}
							<Separator class="bg-border/60 mx-5 my-2" />
						{/if}
					{/if}
					{#if nav.length}
						<DocsSidebar {nav} class="static block h-auto w-full" />
					{/if}
				</ScrollArea>
			</Sheet.Content>
		</Sheet.Root>

		<div class="flex-1 truncate font-bold">{docsPage.view.title}</div>

		<div class="flex items-center gap-1">
			{#if actions}
				{@render actions()}
			{/if}

			{#if search}
				<Button variant="ghost" size="icon" class="size-8" onclick={() => (search.open = true)}>
					<SearchIcon class="size-4" />
					<span class="sr-only">Search documentation</span>
				</Button>
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

			{#if tocItems.length > 0}
				<Popover.Root bind:open={isTocOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<!-- Labeled (not icon-only) so first-timers find "on this page"
							     without guessing PanelRight. Label collapses on the narrowest
							     phones so the title still has room. -->
							<Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2" {...props}>
								<List class="size-4 shrink-0" />
								<span class="text-xs font-medium max-[22rem]:sr-only">On this page</span>
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="max-h-[60vh] w-64 overflow-y-auto p-4" align="end">
						<TableOfContents items={tocItems} activeId={tocActiveId} class="static block w-full" />
					</Popover.Content>
				</Popover.Root>
			{/if}
		</div>
	</div>
</header>
