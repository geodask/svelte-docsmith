<script lang="ts">
	// PROTOTYPE — Variant C, "Preset remix": today's /themes page, unchanged in
	// shape, with a Customize dock. Pick a preset, then nudge it; the dock's
	// controls override only what they touch.
	import { themes } from '#lib/themes-data.ts';
	import ThemePicker from '#lib/components/theme-picker.svelte';
	import ThemeShowcase from '#lib/components/theme-showcase.svelte';
	import { fromTokens } from './core.ts';
	import { Builder } from './builder.svelte.ts';
	import Controls from './controls.svelte';
	import ExportPanel from './export-panel.svelte';
	import ImportBox from './import-box.svelte';
	import SamplePage from './sample-page.svelte';

	const builder = new Builder();
	builder.start();

	let preset = $state('darkmatter');
	let dock = $state<'closed' | 'tweak' | 'paste'>('tweak');
	let sheet = $state(false);
	// Start from Darkmatter's own tokens, as the page does today.
	builder.load(fromTokens(themes[0]));
	function pick(slug: string) {
		preset = slug;
		const t = themes.find((x) => x.slug === slug);
		if (t) builder.load(fromTokens(t, builder.state.inputs));
	}
	const edited = $derived(
		Object.keys(builder.state.overrides.light).length <
			Object.keys(themes.find((x) => x.slug === preset)?.light ?? {}).length
	);
</script>

<section class="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8">
	<h1 class="text-4xl font-semibold tracking-tight">Themes</h1>
	<p class="text-muted-foreground mt-4 max-w-2xl text-lg">
		Pick a preset, then make it yours with the Customize panel. Everything here, and the whole site,
		follows along.
	</p>
	<div class="mt-8"><ThemePicker {themes} active={preset} onselect={pick} /></div>
	<p class="text-muted-foreground mt-3 text-sm">
		Showing <span class="text-foreground font-medium"
			>{themes.find((t) => t.slug === preset)?.name}</span
		>
		{#if edited}<span class="text-primary">· customised</span>{/if}
	</p>
	<div class="mt-8"><SamplePage /></div>
	<div class="mt-8"><ThemeShowcase /></div>
</section>

<!-- The dock -->
<div class="fixed right-4 bottom-20 z-50 w-80 max-w-[calc(100vw-2rem)]">
	{#if dock === 'closed'}
		<button
			class="bg-primary text-primary-foreground ml-auto block rounded-full px-4 py-2 text-sm font-medium shadow-lg"
			onclick={() => (dock = 'tweak')}>Customize</button
		>
	{:else}
		<div class="bg-popover text-popover-foreground border-border rounded-xl border p-4 shadow-xl">
			<div class="mb-3 flex items-center gap-2 text-sm">
				<button
					class="font-medium {dock === 'tweak' ? '' : 'text-muted-foreground'}"
					onclick={() => (dock = 'tweak')}>Customize</button
				>
				<button
					class="font-medium {dock === 'paste' ? '' : 'text-muted-foreground'}"
					onclick={() => (dock = 'paste')}>Paste a theme</button
				>
				<button
					class="text-muted-foreground ml-auto"
					aria-label="Close"
					onclick={() => (dock = 'closed')}>✕</button
				>
			</div>
			{#if dock === 'tweak'}
				<Controls {builder} dense />
			{:else}
				<ImportBox {builder} onimported={() => (dock = 'tweak')} />
			{/if}
			<button
				class="bg-primary text-primary-foreground mt-4 w-full rounded-md py-2 text-sm font-medium"
				onclick={() => (sheet = true)}
				>{builder.cli ? 'Send to my project' : 'Use this theme'}</button
			>
		</div>
	{/if}
</div>

{#if sheet}
	<div
		class="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
		role="presentation"
		onclick={() => (sheet = false)}
	>
		<div
			class="bg-popover text-popover-foreground border-border w-full max-w-lg rounded-xl border p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (sheet = false)}
		>
			<p class="mb-4 text-lg font-semibold">Use this theme</p>
			<ExportPanel {builder} />
		</div>
	</div>
{/if}
