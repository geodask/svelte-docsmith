<script lang="ts">
	import { DocsShell } from 'svelte-docsmith';
	import { themes } from '#lib/themes-data.ts';
	import { themeStore } from '#lib/theme-store.svelte.ts';
	import ThemePicker from '#lib/components/theme-picker.svelte';
	import { Builder } from '#lib/theme-builder/builder.svelte.ts';
	import GuidedPanel from '#lib/theme-builder/guided-panel.svelte';
	import TokensPanel from '#lib/theme-builder/tokens-panel.svelte';
	import ImportPanel from '#lib/theme-builder/import-panel.svelte';
	import ExportPanel from '#lib/theme-builder/export-panel.svelte';
	import PreviewFrame from '#lib/theme-builder/preview-frame.svelte';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	// The theme builder (ADR-0012). The panel and the page around it keep the
	// site's own theme, so a bad colour can't make the controls unreadable; the
	// theme being built shows only in the preview frames, unless the author
	// applies it to the site.
	const builder = new Builder();
	builder.start();

	type Tab = 'guided' | 'tokens' | 'import' | 'export';
	const tabs: [Tab, string][] = [
		['guided', 'Guided'],
		['tokens', 'Tokens'],
		['import', 'Import'],
		['export', 'Export']
	];
	let tab = $state<Tab>('guided');
	let view = $state<'light' | 'dark' | 'both'>('light');
	// A preview frame's own mode toggle switches the view.
	const onmode = (dark: boolean) => (view = dark ? 'dark' : 'light');

	const startedFrom = $derived(builder.origin.kind === 'preset' ? builder.origin.slug : '');
	const siteThemed = $derived(Boolean(themeStore.custom || themeStore.active));
	const issueCount = $derived(builder.issues.length);
</script>

<DocsShell
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
	layout="page"
	seo={{
		title: 'Theme builder',
		description:
			'Build a Svelte DocSmith theme from a preset, your brand colour or a tweakcn export, preview it on a real docs page, and send it to your project.'
	}}
>
	<div class="grid lg:grid-cols-[360px_minmax(0,1fr)]">
		<aside
			class="border-border bg-sidebar text-sidebar-foreground flex flex-col border-b lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:border-r lg:border-b-0"
			aria-label="Theme builder controls"
		>
			<div class="border-border border-b p-4">
				<h1 class="text-lg font-semibold tracking-tight">Theme builder</h1>
				<p class="text-muted-foreground mt-1 text-xs leading-relaxed">
					Start from a preset or your own colour, adjust, and take the theme file to your project.
				</p>
				<p class="text-muted-foreground mt-3 mb-1.5 text-xs font-medium">Start from</p>
				<ThemePicker
					{themes}
					active={startedFrom}
					onselect={(slug) => builder.loadPreset(slug)}
					compact
				/>
				{#if builder.notice}
					<p class="text-muted-foreground mt-3 text-xs" role="status">{builder.notice}</p>
				{/if}
			</div>

			<div class="border-border border-b px-4 py-2">
				<div
					class="bg-muted grid grid-cols-4 gap-1 rounded-md p-1 text-xs font-medium"
					role="tablist"
				>
					{#each tabs as [key, label] (key)}
						<button
							type="button"
							role="tab"
							aria-selected={tab === key}
							class="relative rounded px-1.5 py-1 {tab === key
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (tab = key)}
						>
							{label}
							{#if key === 'tokens' && issueCount}
								<span
									class="bg-destructive absolute top-0.5 right-0.5 size-1.5 rounded-full"
									aria-label="{issueCount} contrast warnings"
								></span>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex-1 overflow-y-auto p-4" role="tabpanel">
				{#if tab === 'guided'}
					<GuidedPanel {builder} />
				{:else if tab === 'tokens'}
					<TokensPanel {builder} />
				{:else if tab === 'import'}
					<ImportPanel {builder} onimported={() => (tab = 'guided')} />
				{:else}
					<ExportPanel {builder} />
				{/if}
			</div>

			{#if tab !== 'export'}
				<div class="border-border border-t p-3">
					<button
						type="button"
						class="bg-primary text-primary-foreground w-full rounded-md py-2 text-sm font-medium"
						onclick={() => (builder.cli ? builder.sendToCli() : (tab = 'export'))}
						>{builder.cli ? 'Send to my project' : 'Use this theme'}</button
					>
				</div>
			{/if}
		</aside>

		<section class="flex min-w-0 flex-col gap-3 p-4 md:p-6" aria-label="Preview">
			<div class="flex flex-wrap items-center gap-3 text-sm">
				<p class="text-muted-foreground">Preview on a docs page, in the theme you're building.</p>
				{#if siteThemed}
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
						onclick={() => themeStore.reset()}
					>
						<RotateCcw class="size-3.5" aria-hidden="true" /> Reset site theme
					</button>
				{/if}
				<div
					class="bg-muted ml-auto grid grid-cols-2 gap-1 rounded-md p-1 text-xs font-medium lg:grid-cols-3"
					role="group"
					aria-label="Preview colour mode"
				>
					{#each [['light', 'Light'], ['dark', 'Dark'], ['both', 'Both']] as const as [v, name] (v)}
						<button
							type="button"
							aria-pressed={view === v}
							class="rounded px-2.5 py-1 {v === 'both' ? 'hidden lg:block' : ''} {view === v
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (view = v)}>{name}</button
						>
					{/each}
				</div>
			</div>

			{#if view === 'both'}
				<div class="hidden gap-4 lg:grid">
					<PreviewFrame
						{onmode}
						tokens={builder.tokens}
						dark={false}
						boxHeight="calc(50vh - 6rem)"
					/>
					<PreviewFrame
						{onmode}
						tokens={builder.tokens}
						dark={true}
						boxHeight="calc(50vh - 6rem)"
					/>
				</div>
				<div class="lg:hidden">
					<PreviewFrame {onmode} tokens={builder.tokens} dark={false} boxHeight="70vh" />
				</div>
			{:else}
				{#key view}
					<PreviewFrame
						{onmode}
						tokens={builder.tokens}
						dark={view === 'dark'}
						boxHeight="max(70vh, calc(100vh - 9rem))"
					/>
				{/key}
			{/if}
		</section>
	</div>
</DocsShell>
