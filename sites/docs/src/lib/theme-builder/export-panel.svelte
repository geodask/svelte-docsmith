<script lang="ts">
	// Every way out of the builder: the theme file and its config line, a theme
	// link, and, when a terminal opened the builder, a one-click send with a
	// paste-code fallback.
	import type { Builder } from './builder.svelte.ts';

	let { builder }: { builder: Builder } = $props();
	let copied = $state('');

	async function copy(label: string, text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = label;
		} catch {
			copied = '';
		}
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
	const pre = 'bg-muted text-foreground rounded-md p-3 font-mono text-xs';
</script>

<div class="flex flex-col gap-6 text-sm">
	{#if builder.cli}
		<section
			class="border-primary/40 bg-primary/5 rounded-lg border p-3"
			aria-label="Send to your project"
		>
			<p class="font-medium">Your terminal is waiting for this theme.</p>
			<p class="text-muted-foreground mt-1 text-xs">
				Sending writes <code class="font-mono">src/theme.css</code> and points
				<code class="font-mono">docsmith(&#123; theme &#125;)</code> at it.
			</p>
			<button
				type="button"
				class="bg-primary text-primary-foreground mt-3 w-full rounded-md py-2 font-medium"
				onclick={() => builder.sendToCli()}>Send to my project</button
			>
			<details class="mt-2">
				<summary class="text-muted-foreground cursor-pointer text-xs"
					>Didn't arrive? Paste a code instead</summary
				>
				<p class="text-muted-foreground mt-2 text-xs">
					Copy this and paste it at the terminal's prompt.
				</p>
				<button
					type="button"
					class="{btn} mt-2 w-full"
					onclick={() => copy('code', builder.pasteCode)}
					>{copied === 'code' ? 'Copied' : 'Copy code'}</button
				>
			</details>
		</section>
	{/if}

	<section>
		<h3 class="font-medium">1. Save the theme file</h3>
		<div class="mt-2 flex gap-2">
			<button type="button" class={btn} onclick={() => copy('file', builder.file)}
				>{copied === 'file' ? 'Copied' : 'Copy'}</button
			>
			<button type="button" class={btn} onclick={download}>Download theme.css</button>
		</div>
		<pre
			class="{pre} text-muted-foreground mt-2 max-h-56 overflow-auto text-[11px] leading-snug">{builder.file}</pre>
	</section>

	<section>
		<h3 class="font-medium">2. Point docsmith() at it</h3>
		<pre class="{pre} mt-2">docsmith(&#123; site, theme: './src/theme.css' &#125;)</pre>
		<p class="text-muted-foreground mt-2 text-xs">
			Or run <code class="font-mono">npx svelte-docsmith theme</code> in your project and it does both
			steps.
		</p>
	</section>

	<section>
		<h3 class="font-medium">Come back to it later</h3>
		<p class="text-muted-foreground mt-1 text-xs">
			A theme link reopens the builder on exactly this theme.
		</p>
		<button type="button" class="{btn} mt-2" onclick={() => copy('link', builder.link)}
			>{copied === 'link' ? 'Copied' : 'Copy theme link'}</button
		>
	</section>

	<section>
		<h3 class="font-medium">Look around in it</h3>
		<p class="text-muted-foreground mt-1 text-xs">
			Paint this theme on the whole docs site while you browse.
		</p>
		<button type="button" class="{btn} mt-2" onclick={() => builder.applyToSite()}
			>Apply to this site</button
		>
	</section>
</div>
