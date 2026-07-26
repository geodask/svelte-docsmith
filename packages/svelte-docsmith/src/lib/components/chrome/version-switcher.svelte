<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import type { VersionLink } from '$lib/core/index.js';

	// Purely presentational: where each version leads is resolved once, with the
	// rest of the page view, in `core/docs-page.ts`.
	const {
		links
	}: {
		/** Every declared version and its destination, in switcher order. */
		links: VersionLink[];
	} = $props();

	const active = $derived(links.find((link) => link.active));

	function select(link: VersionLink) {
		if (link.active) return;
		goto(link.href);
	}
</script>

<!-- Nothing to switch from without an active version, which only happens on an
     unversioned site, where the header doesn't render this at all. -->
{#if active}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					variant="outline"
					size="sm"
					class="h-8 gap-1.5 px-2.5 font-medium"
					aria-label={`Documentation version: ${active.label}. Change version`}
					{...props}
				>
					<span class="truncate">{active.label}</span>
					<ChevronsUpDown class="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start" class="w-44">
			{#each links as link (link.id)}
				<DropdownMenu.Item onSelect={() => select(link)} class="gap-2">
					<Check class="size-4 {link.active ? 'opacity-100' : 'opacity-0'}" aria-hidden="true" />
					<span class="flex-1 truncate">{link.label}</span>
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
