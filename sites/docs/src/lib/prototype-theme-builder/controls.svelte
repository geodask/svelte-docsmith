<script lang="ts">
	// PROTOTYPE — throwaway. The guided controls, in four groups a variant can
	// lay out however it likes.
	import { fontOptions, type Shadow } from './core.ts';
	import type { Builder } from './builder.svelte.ts';

	type Group = 'brand' | 'surfaces' | 'shape' | 'type';
	let {
		builder,
		groups = ['brand', 'surfaces', 'shape', 'type'],
		dense = false
	}: { builder: Builder; groups?: Group[]; dense?: boolean } = $props();

	const i = $derived(builder.state.inputs);
	const swatches = [
		'#d97a2b',
		'#e11d48',
		'#7c3aed',
		'#2563eb',
		'#0891b2',
		'#059669',
		'#65a30d',
		'#18181b'
	];
	const shadows: [Shadow, string][] = [
		['none', 'None'],
		['soft', 'Soft'],
		['crisp', 'Crisp'],
		['offset', 'Offset']
	];
	const label = $derived(dense ? 'text-xs font-medium' : 'text-sm font-medium');
	const select =
		'border-input bg-background focus:ring-ring w-full rounded-md border px-2 py-1.5 text-sm focus:ring-2 focus:outline-none';
</script>

<div class="flex flex-col {dense ? 'gap-3' : 'gap-5'}">
	{#if groups.includes('brand')}
		<div>
			<p class={label}>Brand colour</p>
			{#if !dense}<p class="text-muted-foreground mt-0.5 text-xs">
					Buttons, links and focus rings. Code colours and charts are spread from its hue.
				</p>{/if}
			<div class="mt-2 flex flex-wrap items-center gap-1.5">
				{#each swatches as s (s)}
					<button
						class="size-6 rounded-full ring-offset-2 ring-offset-[var(--background)] {i.brand === s
							? 'ring-foreground ring-2'
							: ''}"
						style="background: {s}"
						aria-label={s}
						onclick={() => builder.set({ brand: s })}
					></button>
				{/each}
				<label
					class="border-border flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs"
				>
					<input
						type="color"
						value={i.brand}
						oninput={(e) => builder.set({ brand: e.currentTarget.value })}
						class="size-5 cursor-pointer bg-transparent"
					/>
					<span class="font-mono">{i.brand}</span>
				</label>
			</div>
		</div>
	{/if}

	{#if groups.includes('surfaces')}
		<div>
			<div class="flex items-baseline justify-between">
				<p class={label}>Neutral tint</p>
				<span class="text-muted-foreground font-mono text-xs">{Math.round(i.tint * 100)}%</span>
			</div>
			{#if !dense}<p class="text-muted-foreground mt-0.5 text-xs">
					How much of the brand hue the background, borders and muted text carry.
				</p>{/if}
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={i.tint}
				oninput={(e) => builder.set({ tint: +e.currentTarget.value })}
				class="accent-primary mt-2 w-full"
			/>
		</div>
	{/if}

	{#if groups.includes('shape')}
		<div>
			<div class="flex items-baseline justify-between">
				<p class={label}>Corner radius</p>
				<span class="text-muted-foreground font-mono text-xs">{i.radius}rem</span>
			</div>
			<input
				type="range"
				min="0"
				max="1.5"
				step="0.125"
				value={i.radius}
				oninput={(e) => builder.set({ radius: +e.currentTarget.value })}
				class="accent-primary mt-2 w-full"
			/>
		</div>
		<div>
			<p class={label}>Shadows</p>
			<div class="bg-muted mt-2 grid grid-cols-4 gap-1 rounded-md p-1">
				{#each shadows as [value, name] (value)}
					<button
						class="rounded px-2 py-1 text-xs font-medium {i.shadow === value
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground'}"
						onclick={() => builder.set({ shadow: value })}>{name}</button
					>
				{/each}
			</div>
		</div>
	{/if}

	{#if groups.includes('type')}
		<div class="grid gap-3 {dense ? 'grid-cols-2' : ''}">
			<label class="block">
				<span class={label}>Text font</span>
				<select
					class="{select} mt-1.5"
					value={i.fontSans}
					onchange={(e) => builder.set({ fontSans: e.currentTarget.value })}
				>
					{#each fontOptions.sans as f (f)}<option>{f}</option>{/each}
				</select>
			</label>
			<label class="block">
				<span class={label}>Code font</span>
				<select
					class="{select} mt-1.5"
					value={i.fontMono}
					onchange={(e) => builder.set({ fontMono: e.currentTarget.value })}
				>
					{#each fontOptions.mono as f (f)}<option>{f}</option>{/each}
				</select>
			</label>
		</div>
		{#if !dense}<p class="text-muted-foreground -mt-2 text-xs">
				The theme names the font; your site loads it (a link in app.html or @fontsource).
			</p>{/if}
	{/if}
</div>
