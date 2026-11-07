<script lang="ts">
	import { mode } from 'mode-watcher';
	import Check from '@lucide/svelte/icons/check';
	import type { Theme } from '#lib/themes-data.ts';

	// Presentational preset chooser shared by the theme builder (start from a
	// preset) and the theming page (apply one site-wide). It owns no state — the parent
	// passes the active slug and a select handler.
	let {
		themes,
		active,
		onselect,
		compact = false
	}: {
		themes: Theme[];
		active: string;
		onselect: (slug: string) => void;
		compact?: boolean;
	} = $props();

	// The swatch dot shows the theme's own primary for the mode you're viewing, so
	// dark-mode dots reflect dark-mode primaries rather than always the light one.
	const dot = (t: Theme) => (mode.current === 'dark' ? t.dark.primary : t.light.primary);
</script>

<div
	class="flex flex-wrap {compact ? 'gap-1.5' : 'gap-2'}"
	role="group"
	aria-label="Choose a preset"
>
	{#each themes as t (t.slug)}
		{@const isActive = active === t.slug}
		<button
			type="button"
			onclick={() => onselect(t.slug)}
			aria-pressed={isActive}
			class="focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center rounded-full border font-medium {compact
				? 'gap-1.5 py-1 pr-2 pl-1 text-xs'
				: 'gap-2 py-1.5 pr-3 pl-1.5 text-sm'} transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 {isActive
				? 'border-primary bg-primary/10 text-foreground'
				: 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'}"
		>
			<span
				class="{compact
					? 'size-3'
					: 'size-4'} shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/20"
				style="background: {dot(t)}"
			></span>
			{t.name}
			{#if isActive}<Check class="text-primary size-3.5" aria-hidden="true" />{/if}
		</button>
	{/each}
</div>
