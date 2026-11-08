<script lang="ts">
	// Every way out of the builder. The one-step way first: the terminal that
	// opened the builder, or the command that would. Then the file and config
	// line by hand, a link to share, and painting the site to look around.
	import type { Builder } from './builder.svelte.ts';
	import { themeStore } from '#lib/theme-store.svelte.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import CopyField from './copy-field.svelte';
	import Terminal from '@lucide/svelte/icons/terminal';
	import Send from '@lucide/svelte/icons/send';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Download from '@lucide/svelte/icons/download';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Paintbrush from '@lucide/svelte/icons/paintbrush';

	let { builder }: { builder: Builder } = $props();
	let copiedFile = $state(false);
	let applied = $state(false);

	const lines = $derived(builder.file.trimEnd().split('\n').length);
	// The button says "Applied" until the theme changes or the site is reset.
	const showApplied = $derived(applied && themeStore.custom !== null);
	$effect(() => {
		void builder.tokens;
		applied = false;
	});

	async function copyFile() {
		try {
			await navigator.clipboard.writeText(builder.file);
			copiedFile = true;
			setTimeout(() => (copiedFile = false), 1500);
		} catch {
			copiedFile = false;
		}
	}

	function download() {
		const url = URL.createObjectURL(new Blob([builder.file], { type: 'text/css' }));
		const a = Object.assign(document.createElement('a'), { href: url, download: 'theme.css' });
		a.click();
		URL.revokeObjectURL(url);
	}

	function apply() {
		builder.applyToSite();
		applied = true;
	}

	const hint = 'text-muted-foreground text-xs leading-relaxed';
	const step =
		'bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tabular-nums';
</script>

<div class="flex flex-col gap-6 text-sm">
	<section
		class="border-primary/30 bg-primary/5 rounded-lg border p-4"
		aria-labelledby="export-project"
	>
		<div class="flex items-center gap-2">
			<span
				class="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-md"
			>
				<Terminal class="size-3.5" aria-hidden="true" />
			</span>
			<h3 id="export-project" class="font-medium">
				{builder.cli ? 'Your terminal is waiting' : 'Add it to your project'}
			</h3>
		</div>
		{#if builder.cli}
			<p class="{hint} mt-2">
				Sending writes <code class="font-mono">src/theme.css</code> and sets
				<code class="font-mono">theme</code> in your <code class="font-mono">docsmith()</code> options.
			</p>
			<Button class="mt-3 w-full" onclick={() => builder.sendToCli()}>
				<Send aria-hidden="true" /> Send to my project
			</Button>
			<details class="group mt-3">
				<summary
					class="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 text-xs [&::-webkit-details-marker]:hidden"
				>
					<ChevronRight
						class="size-3.5 transition-transform group-open:rotate-90"
						aria-hidden="true"
					/>
					Didn't arrive? Paste a code instead
				</summary>
				<p class="{hint} mt-2">Copy this and paste it at the terminal's prompt.</p>
				<div class="mt-2"><CopyField value={builder.pasteCode} label="paste code" /></div>
			</details>
		{:else}
			<p class="{hint} mt-2">
				Run this in your docs app. It opens the builder with your work still here, and a Send button
				that writes the file and sets the config for you.
			</p>
			<div class="mt-3">
				<CopyField value="npx svelte-docsmith theme" label="command" prefix="$ " />
			</div>
		{/if}
	</section>

	<section aria-labelledby="export-hand">
		<h3 id="export-hand" class="font-medium">Or add it by hand</h3>
		<ol class="mt-3 flex flex-col gap-4">
			<li class="flex gap-3">
				<span class={step} aria-hidden="true">1</span>
				<div class="min-w-0 flex-1">
					<p>Save it as <code class="font-mono text-xs">src/theme.css</code></p>
					<div class="mt-2 grid grid-cols-2 gap-2">
						<Button variant="outline" size="sm" onclick={copyFile}>
							{#if copiedFile}<Check aria-hidden="true" /> Copied{:else}<Copy aria-hidden="true" /> Copy
							{/if}
						</Button>
						<Button variant="outline" size="sm" onclick={download}>
							<Download aria-hidden="true" /> Download
						</Button>
					</div>
					<details class="group mt-2">
						<summary
							class="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 text-xs [&::-webkit-details-marker]:hidden"
						>
							<ChevronRight
								class="size-3.5 transition-transform group-open:rotate-90"
								aria-hidden="true"
							/>
							Show the file ({lines} lines)
						</summary>
						<pre
							class="bg-muted text-muted-foreground mt-2 max-h-64 overflow-auto rounded-md p-3 font-mono text-[11px] leading-snug">{builder.file}</pre>
					</details>
				</div>
			</li>
			<li class="flex gap-3">
				<span class={step} aria-hidden="true">2</span>
				<div class="min-w-0 flex-1">
					<p>Point <code class="font-mono text-xs">docsmith()</code> at it</p>
					<p class="{hint} mt-0.5">In the options in your vite.config:</p>
					<div class="mt-2">
						<CopyField value="theme: './src/theme.css'," label="config line" />
					</div>
				</div>
			</li>
		</ol>
	</section>

	<section aria-labelledby="export-link">
		<h3 id="export-link" class="font-medium">Share it</h3>
		<p class="{hint} mt-0.5">This link reopens the builder on exactly this theme.</p>
		<div class="mt-2"><CopyField value={builder.link} label="theme link" /></div>
	</section>

	<section aria-labelledby="export-site">
		<h3 id="export-site" class="font-medium">See it on the whole site</h3>
		<p class="{hint} mt-0.5">
			Paint this theme on every page of these docs while you browse. Reset site theme, by the
			preview, puts it back.
		</p>
		<Button variant="outline" size="sm" class="mt-2" onclick={apply} disabled={showApplied}>
			{#if showApplied}<Check aria-hidden="true" /> Applied to the site{:else}<Paintbrush
					aria-hidden="true"
				/> Apply to this site{/if}
		</Button>
	</section>
</div>
