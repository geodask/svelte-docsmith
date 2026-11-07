<script lang="ts">
	// Paste a theme file (a tweakcn or shadcn export, a preset, or one of ours)
	// to keep working on it.
	import { parseThemeFile } from './core.ts';
	import type { Builder } from './builder.svelte.ts';

	let { builder, onimported }: { builder: Builder; onimported?: () => void } = $props();
	let text = $state('');
	let error = $state('');

	function load() {
		const parsed = parseThemeFile(text);
		if ('error' in parsed) {
			error = parsed.error;
			return;
		}
		builder.loadTokens(parsed);
		builder.notice = `Imported ${Object.keys(parsed.light).length} light and ${Object.keys(parsed.dark).length} dark tokens. The controls now adjust it.`;
		text = '';
		error = '';
		onimported?.();
	}
</script>

<div class="flex flex-col gap-3 text-sm">
	<p class="text-muted-foreground text-xs leading-relaxed">
		Paste a theme file: a <a
			class="text-primary underline-offset-4 hover:underline"
			href="https://tweakcn.com/">tweakcn</a
		>
		or shadcn export works as it is, <code class="font-mono">@theme inline</code> block and all.
	</p>
	<textarea
		bind:value={text}
		rows="10"
		aria-label="Theme file"
		placeholder={':root {\n  --background: oklch(1 0 0);\n  --primary: …\n}\n\n.dark { … }'}
		class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring rounded-md border p-2 font-mono text-xs outline-none focus-visible:ring-2"
	></textarea>
	{#if error}<p class="text-destructive text-xs" role="alert">{error}</p>{/if}
	<button
		type="button"
		class="bg-primary text-primary-foreground self-start rounded-md px-3 py-1.5 font-medium disabled:opacity-50"
		disabled={!text.trim()}
		onclick={load}>Import</button
	>
</div>
