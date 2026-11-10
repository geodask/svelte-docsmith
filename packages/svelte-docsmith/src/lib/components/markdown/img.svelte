<script lang="ts">
	// A markdown image. The markdown pipeline marks one that is the only thing
	// in its paragraph as `standalone` (and lifts it out of the paragraph), so
	// it is drawn as a figure with its title as the caption. An image inside a
	// sentence stays inline, its title a hover hint. An image inside a link
	// comes with `zoom` off, so a click follows the link. See
	// `buildtime/images.ts`.
	import ImageView from '../docs/image-view.svelte';

	const {
		src,
		alt = '',
		title,
		standalone = false,
		zoom = true
	}: { src: string; alt?: string; title?: string; standalone?: boolean; zoom?: boolean } = $props();
</script>

{#if standalone}
	<ImageView {src} {alt} caption={title} {zoom} figure />
{:else}
	<ImageView {src} {alt} {title} {zoom} />
{/if}
