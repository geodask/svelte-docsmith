<script lang="ts">
	// The guided controls: a few inputs that steer every token. Moving one
	// replaces only the tokens it changes, even over a preset or a paste.
	import { fontOptions, oklchToHex, parseColour, shadowOptions } from './core.ts';
	import type { Builder } from './builder.svelte.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.ts';
	import { Slider } from '#lib/components/ui/slider/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import Pipette from '@lucide/svelte/icons/pipette';

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
	// A typed hex (or any colour CSS takes) applies once it parses.
	function typeBrand(value: string) {
		const colour = parseColour(value.trim());
		if (colour) builder.set({ brand: oklchToHex(colour) });
	}
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
		</div>
		<div class="mt-2.5 flex items-center gap-2">
			<!-- The system colour dialog, behind a swatch: shadcn has no picker. -->
			<label
				class="border-input focus-within:ring-ring/50 relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border shadow-xs focus-within:ring-3"
				style="background: {i.brand}"
				title="Pick any colour"
			>
				<Pipette class="size-4 text-white mix-blend-difference" aria-hidden="true" />
				<input
					type="color"
					value={/^#[0-9a-f]{6}$/i.test(i.brand) ? i.brand : '#000000'}
					oninput={(e) => builder.set({ brand: e.currentTarget.value })}
					class="absolute inset-0 cursor-pointer opacity-0"
					aria-label="Pick any brand colour"
				/>
			</label>
			<Input
				value={i.brand}
				onchange={(e) => typeBrand(e.currentTarget.value)}
				class="font-mono"
				aria-label="Brand colour, as hex or any CSS colour"
			/>
		</div>
	</fieldset>

	<div>
		<div class="flex items-baseline justify-between">
			<Label id="tint-label">Neutral tint</Label>
			<span class="text-muted-foreground font-mono text-xs">{Math.round(i.tint * 100)}%</span>
		</div>
		<p class={hint}>How much of the brand hue the page, borders and muted text carry.</p>
		<Slider
			type="single"
			min={0}
			max={1}
			step={0.05}
			value={i.tint}
			onValueChange={(v) => builder.set({ tint: v })}
			aria-labelledby="tint-label"
			class="mt-3"
		/>
	</div>

	<div>
		<div class="flex items-baseline justify-between">
			<Label id="radius-label">Corner radius</Label>
			<span class="text-muted-foreground font-mono text-xs">{i.radius}rem</span>
		</div>
		<Slider
			type="single"
			min={0}
			max={1.5}
			step={0.125}
			value={i.radius}
			onValueChange={(v) => builder.set({ radius: v })}
			aria-labelledby="radius-label"
			class="mt-3"
		/>
	</div>

	<fieldset>
		<legend class="text-sm font-medium">Shadows</legend>
		<ToggleGroup.Root
			type="single"
			variant="outline"
			size="sm"
			value={i.shadow}
			onValueChange={(v) => v && builder.set({ shadow: v as typeof i.shadow })}
			class="mt-2 w-full"
		>
			{#each shadowOptions as [value, name] (value)}
				<ToggleGroup.Item {value} class="flex-1">{name}</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
	</fieldset>

	<div class="grid gap-3">
		{#each [{ id: 'font-sans', label: 'Text font', key: 'fontSans', options: sans }, { id: 'font-mono', label: 'Code font', key: 'fontMono', options: mono }] as const as field (field.id)}
			<div class="grid gap-1.5">
				<Label id={field.id}>{field.label}</Label>
				<Select.Root
					type="single"
					value={i[field.key]}
					onValueChange={(v) => v && builder.set({ [field.key]: v })}
				>
					<Select.Trigger class="w-full" aria-labelledby={field.id}>
						{i[field.key]}
					</Select.Trigger>
					<Select.Content>
						{#each field.options as f (f)}
							<Select.Item value={f} label={f} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{/each}
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
