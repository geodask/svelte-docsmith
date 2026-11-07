<script lang="ts">
	// Paste a theme file (a tweakcn or shadcn export, a preset, or one of ours)
	// to keep working on it.
	import { parseThemeFile } from './core.ts';
	import type { Builder } from './builder.svelte.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';

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
	<Textarea
		bind:value={text}
		rows={10}
		aria-label="Theme file"
		placeholder={':root {\n  --background: oklch(1 0 0);\n  --primary: …\n}\n\n.dark { … }'}
		class="font-mono text-xs md:text-xs"
	/>
	{#if error}<p class="text-destructive text-xs" role="alert">{error}</p>{/if}
	<Button class="self-start" disabled={!text.trim()} onclick={load}>Import</Button>
</div>
