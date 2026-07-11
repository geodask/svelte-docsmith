<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Command from '$lib/ui/shadcn/command/index.js';
	import { useSearch } from '$lib/search/context.svelte.js';
	import type { SearchDoc } from '$lib/config.js';
	import type { SearchEngine } from '$lib/search/create-search.js';
	import CornerDownLeft from '@lucide/svelte/icons/corner-down-left';
	import FileText from '@lucide/svelte/icons/file-text';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import SearchIcon from '@lucide/svelte/icons/search';

	const {
		load,
		placeholder = 'Search documentation...'
	}: {
		/**
		 * Lazily provide the generated search records. Wired by the consumer so the
		 * index is code-split and only fetched when the palette first opens, e.g.
		 * `() => import('svelte-docsmith/search').then((m) => m.docs)`.
		 */
		load: () => Promise<SearchDoc[]>;
		placeholder?: string;
	} = $props();

	const search = useSearch();

	let query = $state('');
	let engine = $state<SearchEngine | null>(null);
	let status = $state<'idle' | 'loading' | 'error'>('idle');

	const trimmed = $derived(query.trim());
	const results = $derived(engine && trimmed ? engine.search(query) : []);

	// Build the index the first time the palette opens; keep it for later opens.
	async function ensureEngine() {
		if (engine || status === 'loading') return;
		status = 'loading';
		try {
			const [{ createSearchEngine }, docs] = await Promise.all([
				import('$lib/search/create-search.js'),
				load()
			]);
			engine = createSearchEngine(docs);
			status = 'idle';
		} catch (error) {
			console.error('[svelte-docsmith] failed to load the search index', error);
			status = 'error';
		}
	}

	$effect(() => {
		if (search?.open) ensureEngine();
	});

	function onWindowKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			if (search) search.open = !search.open;
		}
	}

	function select(path: string) {
		if (search) search.open = false;
		query = '';
		goto(path);
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if search}
	<Command.Dialog
		bind:open={search.open}
		shouldFilter={false}
		title="Search"
		description="Search the documentation"
		class="ring-border/70 shadow-2xl ring-1 sm:max-w-xl"
	>
		<Command.Input bind:value={query} {placeholder} />

		<div class="bg-border/50 -mx-1 mt-1 h-px"></div>

		<Command.List class="scrollbar-slim max-h-[min(24rem,60vh)] px-2 py-2">
			{#if status === 'loading'}
				<div class="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
					<LoaderCircle class="size-4 animate-spin" />
					Loading search…
				</div>
			{:else if status === 'error'}
				<div class="text-muted-foreground px-4 py-10 text-center text-sm">
					Search is unavailable right now.
				</div>
			{:else if !trimmed}
				<div
					class="text-muted-foreground flex flex-col items-center gap-3 px-4 py-10 text-center text-sm"
				>
					<span
						class="bg-muted/60 text-muted-foreground flex size-11 items-center justify-center rounded-full"
					>
						<SearchIcon class="size-5" />
					</span>
					<span>Search across every page of the documentation.</span>
				</div>
			{:else if results.length === 0}
				<div class="text-muted-foreground px-4 py-10 text-center text-sm">
					No results for <span class="text-foreground font-medium">“{trimmed}”</span>.
				</div>
			{:else}
				{#each results as result (result.path)}
					<Command.LinkItem
						href={result.path}
						onSelect={() => select(result.path)}
						class="group/result mb-0.5 flex items-center gap-3 rounded-lg px-2.5 py-2 aria-selected:bg-accent aria-selected:text-accent-foreground"
					>
						<span
							class="border-border/60 bg-muted/40 text-muted-foreground group-aria-selected/result:border-accent-foreground/20 group-aria-selected/result:text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-md border"
						>
							<FileText class="size-4" />
						</span>

						<span class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="flex items-center gap-2">
								<span class="truncate font-medium">{result.title}</span>
								{#if result.section}
									<span
										class="border-border/60 text-muted-foreground group-aria-selected/result:border-accent-foreground/20 group-aria-selected/result:text-accent-foreground/80 ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
									>
										{result.section}
									</span>
								{/if}
							</span>
							{#if result.snippet}
								<span
									class="text-muted-foreground group-aria-selected/result:text-accent-foreground/80 line-clamp-1 text-xs"
								>
									{result.snippet}
								</span>
							{/if}
						</span>

						<CornerDownLeft
							class="text-muted-foreground group-aria-selected/result:text-accent-foreground size-4 shrink-0 opacity-0 group-aria-selected/result:opacity-100"
						/>
					</Command.LinkItem>
				{/each}
			{/if}
		</Command.List>

		<div
			class="border-border/50 text-muted-foreground -mx-1 flex items-center gap-4 border-t px-4 py-2 text-[11px]"
		>
			<span class="flex items-center gap-1.5">
				<kbd class="border-border/60 bg-muted/40 rounded border px-1.5 py-0.5 font-sans">↑</kbd>
				<kbd class="border-border/60 bg-muted/40 rounded border px-1.5 py-0.5 font-sans">↓</kbd>
				to navigate
			</span>
			<span class="flex items-center gap-1.5">
				<kbd class="border-border/60 bg-muted/40 rounded border px-1.5 py-0.5 font-sans">↵</kbd>
				to open
			</span>
			<span class="ml-auto flex items-center gap-1.5">
				<kbd class="border-border/60 bg-muted/40 rounded border px-1.5 py-0.5 font-sans">esc</kbd>
				to close
			</span>
		</div>
	</Command.Dialog>
{/if}
