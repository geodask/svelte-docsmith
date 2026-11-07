<script lang="ts">
	// PROTOTYPE — Variant A, "Guided steps": one question at a time across the
	// top, the sample page full width underneath. Starts by asking where you
	// start from: your brand colour, a preset, or a theme you already have.
	import { themes } from '#lib/themes-data.ts';
	import { fromTokens } from './core.ts';
	import { Builder } from './builder.svelte.ts';
	import Controls from './controls.svelte';
	import ExportPanel from './export-panel.svelte';
	import ImportBox from './import-box.svelte';
	import SamplePage from './sample-page.svelte';

	const builder = new Builder();
	builder.start();

	const steps = ['Start', 'Brand', 'Surfaces', 'Shape', 'Type', 'Use it'] as const;
	let step = $state(0);
	let start = $state<'brand' | 'preset' | 'paste'>('brand');
</script>

<section class="mx-auto max-w-6xl px-4 py-10 md:px-6">
	<h1 class="text-3xl font-semibold tracking-tight">Build a theme</h1>
	<p class="text-muted-foreground mt-2">
		Six short steps. The page below, and this whole site, follow every change.
	</p>

	<ol class="mt-6 flex flex-wrap gap-1.5 text-sm">
		{#each steps as name, n (name)}
			<li>
				<button
					class="rounded-full px-3 py-1 font-medium {n === step
						? 'bg-primary text-primary-foreground'
						: n < step
							? 'bg-secondary text-secondary-foreground'
							: 'text-muted-foreground border-border border'}"
					onclick={() => (step = n)}>{n + 1}. {name}</button
				>
			</li>
		{/each}
	</ol>

	<div
		class="bg-card text-card-foreground border-border mx-auto mt-5 max-w-xl rounded-xl border p-6 shadow-sm"
	>
		{#if step === 0}
			<p class="text-lg font-semibold">Where do you want to start?</p>
			<div class="mt-4 grid gap-2">
				{#each [['brand', 'From my brand colour', 'Pick one colour; we derive the rest.'], ['preset', 'From a preset', 'Start from one of the eleven and adjust it.'], ['paste', 'From a theme I have', 'Paste a tweakcn or shadcn export.']] as const as [key, title, hint] (key)}
					<button
						class="rounded-lg border p-3 text-left {start === key
							? 'border-primary bg-primary/5'
							: 'border-border'}"
						onclick={() => (start = key)}
					>
						<span class="font-medium">{title}</span>
						<span class="text-muted-foreground block text-sm">{hint}</span>
					</button>
				{/each}
			</div>
			{#if start === 'preset'}
				<div class="mt-4 flex flex-wrap gap-1.5">
					{#each themes as t (t.slug)}
						<button
							class="border-border hover:bg-accent flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
							onclick={() => builder.load(fromTokens(t))}
						>
							<span class="size-3 rounded-full" style="background: {t.light.primary}"
							></span>{t.name}
						</button>
					{/each}
				</div>
			{:else if start === 'paste'}
				<div class="mt-4"><ImportBox {builder} /></div>
			{/if}
		{:else if step === 1}
			<p class="mb-4 text-lg font-semibold">What's your brand colour?</p>
			<Controls {builder} groups={['brand']} />
		{:else if step === 2}
			<p class="mb-4 text-lg font-semibold">How warm or cool should the greys be?</p>
			<Controls {builder} groups={['surfaces']} />
		{:else if step === 3}
			<p class="mb-4 text-lg font-semibold">Sharp or soft?</p>
			<Controls {builder} groups={['shape']} />
		{:else if step === 4}
			<p class="mb-4 text-lg font-semibold">Which fonts?</p>
			<Controls {builder} groups={['type']} />
		{:else}
			<p class="mb-4 text-lg font-semibold">Use it in your site</p>
			<ExportPanel {builder} />
		{/if}

		<div class="border-border mt-6 flex justify-between border-t pt-4">
			<button
				class="text-muted-foreground text-sm font-medium disabled:opacity-40"
				disabled={step === 0}
				onclick={() => step--}>← Back</button
			>
			{#if step < steps.length - 1}
				<button
					class="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-medium"
					onclick={() => step++}>Next →</button
				>
			{/if}
		</div>
	</div>

	<div class="mt-10"><SamplePage /></div>
</section>
