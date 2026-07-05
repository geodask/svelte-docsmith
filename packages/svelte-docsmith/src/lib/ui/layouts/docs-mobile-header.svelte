<script lang="ts">
	import { page } from '$app/state';
	import type { DocsmithConfig, NavGroup } from '$lib/config.js';
	import type { TocItem } from '$lib/toc/index.js';
	import DocsSidebar from './docs-sidebar.svelte';
	import TableOfContents from '../table-of-contents.svelte';
	import ThemeToggle from '../theme-toggle.svelte';
	import { Button } from '$lib/ui/shadcn/button/index.js';
	import * as Popover from '$lib/ui/shadcn/popover/index.js';
	import { ScrollArea } from '$lib/ui/shadcn/scroll-area/index.js';
	import * as Sheet from '$lib/ui/shadcn/sheet/index.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import Menu from '@lucide/svelte/icons/menu';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import type { Snippet } from 'svelte';

	const {
		config,
		nav,
		title,
		tocItems,
		tocActiveId = null,
		logo,
		actions
	}: {
		config: DocsmithConfig;
		nav: NavGroup[];
		/** Title of the current page, shown between the menu and controls. */
		title: string;
		/** In-page TOC entries; the TOC popover is hidden when empty. */
		tocItems: TocItem[];
		/** Id of the heading currently in view. */
		tocActiveId?: string | null;
		logo?: Snippet;
		actions?: Snippet;
	} = $props();

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

		<div class="flex-1 truncate font-bold">{title}</div>

		<div class="flex items-center gap-1">
			{#if actions}
				{@render actions()}
			{/if}

			<ThemeToggle />

			{#if tocItems.length > 0}
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
						<TableOfContents items={tocItems} activeId={tocActiveId} class="static block w-full" />
					</Popover.Content>
				</Popover.Root>
			{/if}
		</div>
	</div>
</header>
