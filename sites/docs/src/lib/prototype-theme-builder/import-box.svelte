<script lang="ts">
	// PROTOTYPE — throwaway. Paste a theme file (tweakcn, shadcn or ours) to start from it.
	import { fromTokens, parseThemeFile } from './core.ts';
	import type { Builder } from './builder.svelte.ts';

	let { builder, onimported }: { builder: Builder; onimported?: () => void } = $props();
	let text = $state('');
	let message = $state('');

	function load() {
		const parsed = parseThemeFile(text);
		if ('error' in parsed) {
			message = parsed.error;
			return;
		}
		builder.load(fromTokens(parsed, builder.state.inputs));
		message = `Loaded ${Object.keys(parsed.light).length} light and ${Object.keys(parsed.dark).length} dark tokens. The controls now adjust it.`;
		text = '';
		onimported?.();
	}
</script>

<div class="flex flex-col gap-2 text-sm">
	<textarea
		bind:value={text}
		rows="4"
		placeholder={':root { --primary: … }\n.dark { … }   ← paste a tweakcn or shadcn export'}
		class="border-input bg-background placeholder:text-muted-foreground focus:ring-ring rounded-md border p-2 font-mono text-xs focus:ring-2 focus:outline-none"
	></textarea>
	<button
		class="border-border hover:bg-accent self-start rounded-md border px-2.5 py-1.5 font-medium disabled:opacity-50"
		disabled={!text.trim()}
		onclick={load}>Import</button
	>
	{#if message}<p class="text-muted-foreground text-xs" data-testid="import-message">
			{message}
		</p>{/if}
</div>
