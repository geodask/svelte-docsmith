<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Copy from '@lucide/svelte/icons/copy';
	import FileText from '@lucide/svelte/icons/file-text';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';

	const {
		path,
		origin = ''
	}: {
		/** The current page's normalized pathname, e.g. `/docs/intro`. */
		path: string;
		/** Absolute site origin for the AI deep links; falls back to `location.origin`. */
		origin?: string;
	} = $props();

	// Convention: each page's markdown lives at `<path>.md`, served by the
	// consumer's catch-all endpoint over the `svelte-docsmith/llms` index.
	const mdHref = $derived(`${path}.md`);
	const base = $derived((origin || (browser ? location.origin : '')).replace(/\/$/, ''));
	const absoluteMd = $derived(`${base}${mdHref}`);
	const prompt = $derived(`Read ${absoluteMd} so I can ask questions about this page.`);
	const chatgptHref = $derived(`https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`);
	const claudeHref = $derived(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`);

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	async function copyPage() {
		try {
			const res = await fetch(mdHref);
			if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
			const text = await res.text();
			// `navigator.clipboard` is undefined on insecure origins and can reject
			// without permission; fail quietly so the button never throws.
			await navigator.clipboard.writeText(text);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 1500);
		} catch (error) {
			console.warn('[svelte-docsmith] copy page failed', error);
		}
	}
</script>

<div class="border-border bg-background inline-flex items-center rounded-md border shadow-xs">
	<Button
		variant="ghost"
		size="sm"
		onclick={copyPage}
		class="rounded-r-none"
		aria-label="Copy this page as Markdown"
	>
		{#if copied}
			<Check class="text-primary" />
			Copied
		{:else}
			<Copy />
			Copy page
		{/if}
	</Button>
	<div class="bg-border h-5 w-px" aria-hidden="true"></div>
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					variant="ghost"
					size="sm"
					class="rounded-l-none px-2"
					aria-label="More page actions"
					{...props}
				>
					<ChevronDown />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-56">
			<DropdownMenu.Item onSelect={copyPage}>
				<Copy />
				Copy page
			</DropdownMenu.Item>
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a href={mdHref} target="_blank" rel="noopener" {...props}>
						<FileText />
						View as Markdown
					</a>
				{/snippet}
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a href={chatgptHref} target="_blank" rel="noopener" {...props}>
						<ArrowUpRight />
						Open in ChatGPT
					</a>
				{/snippet}
			</DropdownMenu.Item>
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a href={claudeHref} target="_blank" rel="noopener" {...props}>
						<ArrowUpRight />
						Open in Claude
					</a>
				{/snippet}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
