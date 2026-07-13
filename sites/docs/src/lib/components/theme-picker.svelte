<script lang="ts">
	import { mode } from 'mode-watcher';
	import Check from '@lucide/svelte/icons/check';
	import type { Theme } from '$lib/themes-data';

	// Presentational theme chooser shared by the /themes page (applies site-wide)
	// and the in-docs gallery (scoped preview). It owns no state — the parent
	// passes the active slug and a select handler.
	let {
		themes,
		active,
		onselect
	}: { themes: Theme[]; active: string; onselect: (slug: string) => void } = $props();

	// The swatch dot shows the theme's own primary for the mode you're viewing, so
	// dark-mode dots reflect dark-mode primaries rather than always the light one.
	const dot = (t: Theme) => (mode.current === 'dark' ? t.dark.primary : t.light.primary);
</script>

<div class="flex flex-wrap gap-2" role="group" aria-label="Choose a theme">
	{#each themes as t (t.slug)}
		{@const isActive = active === t.slug}
		<button
			type="button"
			onclick={() => onselect(t.slug)}
			aria-pressed={isActive}
			class="focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 {isActive
				? 'border-primary bg-primary/10 text-foreground'
				: 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'}"
		>
			<span
				class="size-4 shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/20"
				style="background: {dot(t)}"
			></span>
			{t.name}
			{#if isActive}<Check class="text-primary size-3.5" aria-hidden="true" />{/if}
		</button>
	{/each}
</div>
