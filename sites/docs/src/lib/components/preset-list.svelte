<script lang="ts">
	import { themes, defaultThemeSlug } from '#lib/themes-data.ts';
	import { themeStore } from '#lib/theme-store.svelte.ts';
	import ThemePicker from './theme-picker.svelte';

	// The theming page's compact preset list. Picking one applies it across the
	// whole site, as the /themes page does, so the page you are reading becomes
	// the preview; the line below is what selects it in a real site.
	const active = $derived(themeStore.active ?? defaultThemeSlug);
</script>

<div class="not-prose my-6">
	<ThemePicker {themes} {active} onselect={(slug) => themeStore.set(slug)} />
	<p class="text-muted-foreground mt-3 text-sm">
		<code class="text-foreground font-mono text-xs">docsmith(&#123; theme: '{active}' &#125;)</code>
		<span class="mx-1.5">·</span>
		<a href="/themes" class="text-primary font-medium underline-offset-4 hover:underline"
			>See it on every component</a
		>
	</p>
</div>
