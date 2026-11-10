<script lang="ts">
	import ImageView from './image-view.svelte';

	const {
		src,
		dark,
		alt,
		caption
	}: {
		/**
		 * The picture: a URL, or an imported file (`import shot from './shot.png'`).
		 * With `dark`, the picture for light colour mode.
		 */
		src: string;
		/** A different picture for dark colour mode. */
		dark?: string;
		/** What the picture shows, for readers who can't see it. Empty for decoration. */
		alt: string;
		/** Shown below the picture. */
		caption?: string;
	} = $props();
</script>

<ImageView {src} {dark} {alt} {caption} figure />
