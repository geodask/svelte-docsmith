<script lang="ts">
	// A markdown image. The markdown pipeline marks one that is the only thing
	// in its paragraph as `standalone` (and lifts it out of the paragraph), so
	// it is drawn as a figure with its title as the caption. An image inside a
	// sentence stays inline, its title a hover hint. See `buildtime/images.ts`.
	import ImageView from '../docs/image-view.svelte';

	const {
		src,
		alt = '',
		title,
		standalone = false
	}: { src: string; alt?: string; title?: string; standalone?: boolean } = $props();
</script>

{#if standalone}
	<ImageView {src} {alt} caption={title} figure />
{:else}
	<ImageView {src} {alt} {title} />
{/if}
