<script lang="ts">
	// PROTOTYPE — throwaway. Every way out of the builder: the theme file, the
	// config line, a theme link, and (when a terminal opened the builder) a
	// one-click send with a paste-code fallback.
	import type { Builder } from './builder.svelte.ts';

	let { builder, showFile = true }: { builder: Builder; showFile?: boolean } = $props();
	let copied = $state('');

	async function copy(label: string, text: string) {
		await navigator.clipboard?.writeText(text).catch(() => {});
		copied = label;
		setTimeout(() => (copied = ''), 1500);
	}

	function download() {
		const url = URL.createObjectURL(new Blob([builder.file], { type: 'text/css' }));
		const a = Object.assign(document.createElement('a'), { href: url, download: 'theme.css' });
		a.click();
		URL.revokeObjectURL(url);
	}

	const btn =
		'border-border hover:bg-accent hover:text-accent-foreground rounded-md border px-2.5 py-1.5 text-sm font-medium';
</script>

<div class="flex flex-col gap-4 text-sm">
	{#if builder.cli}
		<div class="border-primary/40 bg-primary/5 rounded-lg border p-3" data-testid="cli-send">
			<p class="font-medium">Your terminal is waiting for this theme.</p>
			<p class="text-muted-foreground mt-1">
				Sending writes <code class="font-mono">src/theme.css</code> and points
				<code class="font-mono">docsmith(&#123; theme &#125;)</code> at it.
			</p>
			<button
				class="bg-primary text-primary-foreground mt-3 w-full rounded-md py-2 font-medium shadow-sm"
				onclick={() => builder.sendToCli()}>Send to my project</button
			>
			<details class="mt-2">
				<summary class="text-muted-foreground cursor-pointer text-xs"
					>Didn't arrive? Paste a code instead</summary
				>
				<p class="text-muted-foreground mt-2 text-xs">
					Copy this and paste it into the terminal prompt.
				</p>
				<button class="{btn} mt-2 w-full" onclick={() => copy('code', builder.pasteCode)}
					>{copied === 'code' ? 'Copied' : `Copy code (${builder.pasteCode.length} chars)`}</button
				>
			</details>
		</div>
	{/if}

	<div>
		<p class="mb-1.5 font-medium">1. Save the theme file</p>
		<div class="flex gap-2">
			<button class={btn} onclick={() => copy('file', builder.file)}
				>{copied === 'file' ? 'Copied' : 'Copy'}</button
			>
			<button class={btn} onclick={download}>Download theme.css</button>
		</div>
		{#if showFile}
			<pre
				class="bg-muted text-muted-foreground mt-2 max-h-48 overflow-auto rounded-md p-3 font-mono text-[11px] leading-snug">{builder.file}</pre>
		{/if}
	</div>

	<div>
		<p class="mb-1.5 font-medium">2. Point docsmith() at it</p>
		<pre
			class="bg-muted rounded-md p-3 font-mono text-xs">docsmith(&#123; site, theme: './src/theme.css' &#125;)</pre>
	</div>

	<div>
		<p class="mb-1.5 font-medium">Share or come back later</p>
		<button class={btn} onclick={() => copy('link', builder.link)}
			>{copied === 'link' ? 'Copied' : `Copy theme link (${builder.link.length} chars)`}</button
		>
	</div>
</div>
