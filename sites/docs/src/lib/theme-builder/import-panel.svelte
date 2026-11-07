<script lang="ts">
	// Bring a theme in to keep working on it: a theme file (a tweakcn or shadcn
	// export, a preset, or one of ours) pasted, dropped or chosen, or a theme
	// link. What it found shows as you type, so Import never surprises.
	import { parseThemeFile } from './core.ts';
	import { themeLinkPayload, type Builder } from './builder.svelte.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import FileUp from '@lucide/svelte/icons/file-up';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Link from '@lucide/svelte/icons/link';

	let { builder, onimported }: { builder: Builder; onimported?: () => void } = $props();
	let text = $state('');
	let linkError = $state('');
	let dragging = $state(false);
	let picker: HTMLInputElement | undefined = $state();

	type Reading =
		| { kind: 'empty' }
		| { kind: 'link' }
		| { kind: 'file'; light: number; dark: number }
		| { kind: 'error'; message: string };

	const reading = $derived.by((): Reading => {
		if (!text.trim()) return { kind: 'empty' };
		if (themeLinkPayload(text) && !text.includes('{')) return { kind: 'link' };
		const parsed = parseThemeFile(text);
		if ('error' in parsed) return { kind: 'error', message: parsed.error };
		return {
			kind: 'file',
			light: Object.keys(parsed.light).length,
			dark: Object.keys(parsed.dark).length
		};
	});

	$effect(() => {
		void text;
		linkError = '';
	});

	const plural = (n: number, word: string) => `${n} ${word} token${n === 1 ? '' : 's'}`;

	async function load() {
		if (reading.kind === 'link') {
			try {
				await builder.openLink(text);
			} catch (error) {
				linkError = (error as Error).message;
				return;
			}
			builder.notice = 'Opened the theme link. The controls now adjust it.';
		} else {
			const parsed = parseThemeFile(text);
			if ('error' in parsed) return;
			builder.loadTokens(parsed);
			builder.notice = `Imported ${plural(Object.keys(parsed.light).length, 'light')} and ${plural(Object.keys(parsed.dark).length, 'dark')}. The controls now adjust it.`;
		}
		text = '';
		onimported?.();
	}

	async function readFile(file: File | undefined) {
		if (file) text = await file.text();
	}

	function drop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		readFile(event.dataTransfer?.files[0]);
	}
</script>

<div class="flex flex-col gap-3 text-sm">
	<div>
		<h3 class="font-medium">Bring in a theme</h3>
		<p class="text-muted-foreground mt-0.5 text-xs leading-relaxed">
			Paste a theme file or a theme link. A <a
				class="text-primary underline-offset-4 hover:underline"
				href="https://tweakcn.com/">tweakcn</a
			>
			or shadcn export works as it is, <code class="font-mono">@theme inline</code> block and all.
		</p>
	</div>

	<div
		class="relative"
		role="group"
		aria-label="Theme file drop area"
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={drop}
	>
		<Textarea
			bind:value={text}
			rows={11}
			aria-label="Theme file or theme link"
			aria-describedby="import-status"
			placeholder={':root {\n  --background: oklch(1 0 0);\n  --primary: …\n}\n\n.dark { … }'}
			class="max-h-80 min-h-44 resize-y font-mono text-xs md:text-xs {dragging
				? 'border-primary ring-primary/20 ring-[3px]'
				: ''}"
		/>
		{#if dragging}
			<div
				class="bg-background/80 text-foreground pointer-events-none absolute inset-0 flex items-center justify-center rounded-md text-xs font-medium"
			>
				Drop the .css file
			</div>
		{/if}
	</div>

	<p id="import-status" class="flex min-h-4 items-start gap-1.5 text-xs" aria-live="polite">
		{#if linkError}
			<CircleAlert class="text-destructive mt-px size-3.5 shrink-0" aria-hidden="true" />
			<span class="text-destructive">{linkError}</span>
		{:else if reading.kind === 'file'}
			<CircleCheck
				class="mt-px size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
				aria-hidden="true"
			/>
			<span>Found {plural(reading.light, 'light')} and {plural(reading.dark, 'dark')}.</span>
		{:else if reading.kind === 'link'}
			<Link class="mt-px size-3.5 shrink-0" aria-hidden="true" />
			<span>A theme link. Import opens the theme it carries.</span>
		{:else if reading.kind === 'error'}
			<CircleAlert class="text-muted-foreground mt-px size-3.5 shrink-0" aria-hidden="true" />
			<span class="text-muted-foreground">{reading.message}</span>
		{:else}
			<span class="text-muted-foreground">Or drop a .css file on the box.</span>
		{/if}
	</p>

	<div class="flex gap-2">
		<Button
			class="flex-1"
			disabled={reading.kind !== 'file' && reading.kind !== 'link'}
			onclick={load}>Import</Button
		>
		<Button variant="outline" onclick={() => picker?.click()}>
			<FileUp aria-hidden="true" /> Choose file
		</Button>
		<input
			bind:this={picker}
			type="file"
			accept=".css,text/css"
			class="hidden"
			onchange={(e) => {
				readFile(e.currentTarget.files?.[0]);
				e.currentTarget.value = '';
			}}
		/>
	</div>
	<p class="text-muted-foreground text-xs leading-relaxed">
		Importing replaces the theme you're on. Your hand edits start fresh, and the controls adjust
		what you brought in.
	</p>
</div>
