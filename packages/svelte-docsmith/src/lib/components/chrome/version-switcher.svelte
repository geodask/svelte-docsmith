<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import {
		mapPathToVersion,
		scopeContent,
		type ResolvedVersion,
		type DocsContentItem
	} from '$lib/core/index.js';

	const {
		versions,
		active,
		pathname,
		content
	}: {
		/** All declared versions, in switcher order. */
		versions: ResolvedVersion[];
		/** The version the current page belongs to. */
		active: ResolvedVersion;
		/** The current normalized pathname, e.g. `/docs/v2/intro`. */
		pathname: string;
		/** Full content index, to map the current page into the chosen version. */
		content: DocsContentItem[];
	} = $props();

	function select(target: ResolvedVersion) {
		if (target.id === active.id) return;
		const paths = scopeContent(content, target.id).map((c) => c.path);
		goto(mapPathToVersion(pathname, active, target, paths));
	}
</script>

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
		{#each versions as version (version.id)}
			<DropdownMenu.Item onSelect={() => select(version)} class="gap-2">
				<Check
					class="size-4 {version.id === active.id ? 'opacity-100' : 'opacity-0'}"
					aria-hidden="true"
				/>
				<span class="flex-1 truncate">{version.label}</span>
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
