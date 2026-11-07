<script lang="ts">
	// PROTOTYPE — Variant B, "Editor": a fixed control panel on the left (guided
	// controls, every token, import, export), and the sample page in light and
	// dark side by side, so both modes are judged together.
	import { Builder } from './builder.svelte.ts';
	import Controls from './controls.svelte';
	import ExportPanel from './export-panel.svelte';
	import ImportBox from './import-box.svelte';
	import PreviewFrame from './preview-frame.svelte';

	const builder = new Builder();
	builder.start();

	let tab = $state<'guided' | 'tokens' | 'import' | 'export'>('guided');
	let tokenMode = $state<'light' | 'dark'>('light');

	const previewPage = '/themes/preview';
	let view = $state<'light' | 'dark' | 'both'>('light');
	const shown = $derived(
		tokenMode === 'light'
			? builder.tokens.light
			: { ...builder.tokens.light, ...builder.tokens.dark }
	);
	const overridden = $derived(builder.state.overrides[tokenMode]);
</script>

<div class="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[340px_1fr]">
	<aside
		class="border-border bg-sidebar text-sidebar-foreground flex flex-col border-r lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]"
	>
		<div class="border-border border-b p-4">
			<h1 class="text-lg font-semibold">Theme editor</h1>
			<div class="bg-muted mt-3 grid grid-cols-4 gap-1 rounded-md p-1 text-xs font-medium">
				{#each ['guided', 'tokens', 'import', 'export'] as const as t (t)}
					<button
						class="rounded px-1.5 py-1 capitalize {tab === t
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground'}"
						onclick={() => (tab = t)}>{t}</button
					>
				{/each}
			</div>
		</div>
		<div class="flex-1 overflow-y-auto p-4">
			{#if tab === 'guided'}
				<Controls {builder} />
			{:else if tab === 'tokens'}
				<div class="mb-3 flex gap-1 text-xs">
					{#each ['light', 'dark'] as const as m (m)}
						<button
							class="rounded px-2 py-1 capitalize {tokenMode === m
								? 'bg-primary text-primary-foreground'
								: 'border-border border'}"
							onclick={() => (tokenMode = m)}>{m}</button
						>
					{/each}
				</div>
				<p class="text-muted-foreground mb-3 text-xs">
					Edit any token. An edited token keeps its value until a guided control changes it.
				</p>
				<div class="flex flex-col gap-1.5">
					{#each Object.entries(shown) as [key, value] (key)}
						<label class="flex items-center gap-2 text-xs">
							<span class="border-border size-4 shrink-0 rounded border" style="background: {value}"
							></span>
							<span
								class="w-36 shrink-0 truncate font-mono {key in overridden ? 'text-primary' : ''}"
								>{key}</span
							>
							<input
								{value}
								onchange={(e) => builder.setToken(tokenMode, key, e.currentTarget.value)}
								class="border-input bg-background min-w-0 flex-1 rounded border px-1.5 py-0.5 font-mono"
							/>
						</label>
					{/each}
				</div>
			{:else if tab === 'import'}
				<ImportBox {builder} onimported={() => (tab = 'guided')} />
			{:else}
				<ExportPanel {builder} />
			{/if}
		</div>
		{#if tab !== 'export'}
			<div class="border-border border-t p-3">
				<button
					class="bg-primary text-primary-foreground w-full rounded-md py-2 text-sm font-medium"
					onclick={() => (tab = 'export')}
					>{builder.cli ? 'Send to my project' : 'Use this theme'}</button
				>
			</div>
		{/if}
	</aside>

	<div class="flex min-w-0 flex-col gap-4 p-4 md:p-6">
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<span class="text-muted-foreground"
				>Preview: one docs page built from the real shell components</span
			>
			<div class="bg-muted ml-auto grid grid-cols-3 gap-1 rounded-md p-1 text-xs font-medium">
				{#each [['light', 'Light'], ['dark', 'Dark'], ['both', 'Both']] as const as [v, name] (v)}
					<button
						class="rounded px-2.5 py-1 {view === v
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground'}"
						onclick={() => (view = v)}>{name}</button
					>
				{/each}
			</div>
		</div>
		{#if view === 'both'}
			<div class="grid gap-4">
				<PreviewFrame
					src={previewPage}
					tokens={builder.tokens}
					dark={false}
					boxHeight="calc(50vh - 7rem)"
				/>
				<PreviewFrame
					src={previewPage}
					tokens={builder.tokens}
					dark={true}
					boxHeight="calc(50vh - 7rem)"
				/>
			</div>
		{:else}
			{#key view}
				<PreviewFrame src={previewPage} tokens={builder.tokens} dark={view === 'dark'} />
			{/key}
		{/if}
	</div>
</div>
