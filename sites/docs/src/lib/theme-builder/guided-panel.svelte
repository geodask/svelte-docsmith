<script lang="ts">
	// The guided controls: a few inputs that steer every token. Moving one
	// replaces only the tokens it changes, even over a preset or a paste.
	import { fontOptions, shadowOptions } from './core.ts';
	import type { Builder } from './builder.svelte.ts';

	let { builder }: { builder: Builder } = $props();

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
	// Keep a font the theme names in the list even if it isn't one we suggest.
	const sans = $derived(
		fontOptions.sans.includes(i.fontSans) ? fontOptions.sans : [i.fontSans, ...fontOptions.sans]
	);
	const mono = $derived(
		fontOptions.mono.includes(i.fontMono) ? fontOptions.mono : [i.fontMono, ...fontOptions.mono]
	);
	const select =
		'border-input bg-background focus-visible:ring-ring mt-1.5 w-full rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2';
	const hint = 'text-muted-foreground mt-0.5 text-xs leading-relaxed';
</script>

<div class="flex flex-col gap-6">
	<fieldset>
		<legend class="text-sm font-medium">Brand colour</legend>
		<p class={hint}>
			Buttons, links and focus rings. Charts and code colours are spread from its hue.
		</p>
		<div class="mt-2.5 flex flex-wrap items-center gap-1.5">
			{#each swatches as s (s)}
				<button
					type="button"
					class="ring-offset-background size-6 rounded-full ring-offset-2 outline-none focus-visible:ring-2 {i.brand ===
					s
						? 'ring-foreground ring-2'
						: ''}"
					style="background: {s}"
					aria-label="Brand colour {s}"
					aria-pressed={i.brand === s}
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
					class="size-5 cursor-pointer border-0 bg-transparent p-0"
					aria-label="Pick any brand colour"
				/>
				<span class="font-mono">{i.brand}</span>
			</label>
		</div>
	</fieldset>

	<label class="block">
		<span class="flex items-baseline justify-between text-sm font-medium">
			Neutral tint <span class="text-muted-foreground font-mono text-xs"
				>{Math.round(i.tint * 100)}%</span
			>
		</span>
		<span class="{hint} block"
			>How much of the brand hue the page, borders and muted text carry.</span
		>
		<input
			type="range"
			min="0"
			max="1"
			step="0.05"
			value={i.tint}
			oninput={(e) => builder.set({ tint: +e.currentTarget.value })}
			class="accent-primary mt-2 w-full"
		/>
	</label>

	<label class="block">
		<span class="flex items-baseline justify-between text-sm font-medium">
			Corner radius <span class="text-muted-foreground font-mono text-xs">{i.radius}rem</span>
		</span>
		<input
			type="range"
			min="0"
			max="1.5"
			step="0.125"
			value={i.radius}
			oninput={(e) => builder.set({ radius: +e.currentTarget.value })}
			class="accent-primary mt-2 w-full"
		/>
	</label>

	<fieldset>
		<legend class="text-sm font-medium">Shadows</legend>
		<div class="bg-muted mt-2 grid grid-cols-4 gap-1 rounded-md p-1">
			{#each shadowOptions as [value, name] (value)}
				<button
					type="button"
					aria-pressed={i.shadow === value}
					class="rounded px-2 py-1 text-xs font-medium {i.shadow === value
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => builder.set({ shadow: value })}>{name}</button
				>
			{/each}
		</div>
	</fieldset>

	<div class="grid gap-3">
		<label class="block">
			<span class="text-sm font-medium">Text font</span>
			<select
				class={select}
				value={i.fontSans}
				onchange={(e) => builder.set({ fontSans: e.currentTarget.value })}
			>
				{#each sans as f (f)}<option>{f}</option>{/each}
			</select>
		</label>
		<label class="block">
			<span class="text-sm font-medium">Code font</span>
			<select
				class={select}
				value={i.fontMono}
				onchange={(e) => builder.set({ fontMono: e.currentTarget.value })}
			>
				{#each mono as f (f)}<option>{f}</option>{/each}
			</select>
		</label>
		<p class={hint}>
			A theme names its fonts; your site loads them, with a link in <code class="font-mono"
				>app.html</code
			>
			or
			<code class="font-mono">@fontsource</code>. Inter, Source Serif 4 and JetBrains Mono load by
			default.
		</p>
	</div>
</div>
