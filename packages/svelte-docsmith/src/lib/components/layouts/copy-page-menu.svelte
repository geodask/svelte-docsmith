<script lang="ts">
	import { BROWSER } from 'esm-env';
	import { Button } from '#lib/components/shadcn/button/index.js';
	import * as Dialog from '#lib/components/shadcn/dialog/index.js';
	import * as DropdownMenu from '#lib/components/shadcn/dropdown-menu/index.js';
	import CopyButton from '../chrome/copy-button.svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Copy from '@lucide/svelte/icons/copy';
	import FileText from '@lucide/svelte/icons/file-text';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import Plug from '@lucide/svelte/icons/plug';
	import { join } from '#lib/utils/url.js';
	import { editorSetups, mcpUrl } from '#lib/mcp/connect.js';

	const {
		path,
		origin = '',
		title = '',
		mcp
	}: {
		/** The current page's normalized pathname, e.g. `/docs/intro`. */
		path: string;
		/** Absolute site origin for the AI deep links; falls back to `location.origin`. */
		origin?: string;
		/** Site title, which names the MCP server in the editor setup. */
		title?: string;
		/** Path (or absolute URL) of the site's MCP server; adds "Connect to your editor". */
		mcp?: string;
	} = $props();

	// Convention: each page's markdown lives at `<path>.md`, served by the
	// consumer's catch-all endpoint over the `svelte-docsmith/llms` index.
	const mdHref = $derived(`${path}.md`);
	// Before hydration with no configured origin there is nothing to prefix, and
	// `join` leaves the link site-relative rather than mangling it.
	const siteOrigin = $derived(origin || (BROWSER ? location.origin : ''));
	const absoluteMd = $derived(join(siteOrigin, mdHref));
	const prompt = $derived(`Read ${absoluteMd} so I can ask questions about this page.`);
	const chatgptHref = $derived(`https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`);
	const claudeHref = $derived(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`);

	const serverUrl = $derived(mcp ? mcpUrl(mcp, siteOrigin) : '');
	const setups = $derived(serverUrl ? editorSetups(title, serverUrl) : []);
	let connectOpen = $state(false);

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

	// Which snippet in the connect dialog was just copied, to flip its icon.
	let copiedSnippet = $state<string | null>(null);
	let snippetTimer: ReturnType<typeof setTimeout>;

	async function copySnippet(key: string, text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedSnippet = key;
			clearTimeout(snippetTimer);
			snippetTimer = setTimeout(() => (copiedSnippet = null), 1500);
		} catch (error) {
			console.warn('[svelte-docsmith] copy to clipboard failed', error);
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
			{#if serverUrl}
				<DropdownMenu.Separator />
				<DropdownMenu.Item onSelect={() => (connectOpen = true)}>
					<Plug />
					Connect to your editor
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>

{#if serverUrl}
	<Dialog.Root bind:open={connectOpen}>
		<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>Connect to your editor</Dialog.Title>
				<Dialog.Description>
					Add this MCP server to your editor so its agent can search and read these docs.
				</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-4">
				<div class="grid gap-1.5">
					<span class="font-medium">Server URL</span>
					<div class="bg-muted flex items-center gap-2 rounded-md pl-3">
						<code class="min-w-0 flex-1 truncate font-mono text-xs">{serverUrl}</code>
						<CopyButton
							label="Copy server URL"
							copied={copiedSnippet === 'url'}
							onclick={() => copySnippet('url', serverUrl)}
						/>
					</div>
				</div>
				{#each setups as { editor, file, code } (editor)}
					<div class="grid gap-1.5">
						<div class="flex items-baseline gap-2">
							<span class="font-medium">{editor}</span>
							{#if file}
								<span class="text-muted-foreground font-mono text-xs">{file}</span>
							{/if}
						</div>
						<div class="bg-muted relative rounded-md">
							<pre class="overflow-x-auto p-3 pr-11 font-mono text-xs">{code}</pre>
							<CopyButton
								label="Copy {editor} setup"
								copied={copiedSnippet === editor}
								onclick={() => copySnippet(editor, code)}
								class="absolute top-1 right-1"
							/>
						</div>
					</div>
				{/each}
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}
