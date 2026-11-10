<script lang="ts">
	// Internal: what markdown images and <Image> both draw. A picture (one per
	// colour mode when `dark` is given), zoomable when it is shown smaller than
	// its real size, as a figure with a caption when it stands on its own.
	//
	// Everything here is phrasing content except the <figure>, which is only
	// drawn for a `figure` image, so an image inside a sentence stays valid
	// inside its <p>.
	import * as Dialog from '../shadcn/dialog/index.js';

	const {
		src,
		dark,
		alt,
		title,
		caption,
		figure = false,
		zoom = true
	}: {
		/** The picture, or the light colour mode's picture when `dark` is given. */
		src: string;
		/** The dark colour mode's picture. */
		dark?: string;
		alt: string;
		/** Shown on hover, for an image inside a sentence. */
		title?: string;
		/** Shown below a figure. */
		caption?: string;
		/** Draw a block-level figure, with the caption, rather than an inline image. */
		figure?: boolean;
		/** Offer zoom when the picture is shown smaller than its real size. */
		zoom?: boolean;
	} = $props();

	let open = $state(false);
	let zoomable = $state(false);
	const pictures: HTMLImageElement[] = [];

	/**
	 * Whether the picture on screen (the other one is hidden by colour mode)
	 * is drawn smaller than its natural size, so zooming would show more.
	 */
	function measure() {
		const shown = pictures.find((img) => img.clientWidth > 0);
		zoomable =
			zoom &&
			shown !== undefined &&
			shown.complete &&
			shown.naturalWidth > 0 &&
			(shown.naturalWidth > shown.clientWidth + 1 || shown.naturalHeight > shown.clientHeight + 1);
	}

	/** Track a picture: measured on load, and again whenever its box changes. */
	function track(img: HTMLImageElement) {
		pictures.push(img);
		const observer = new ResizeObserver(measure);
		observer.observe(img);
		img.addEventListener('load', measure);
		measure();
		return {
			destroy() {
				observer.disconnect();
				img.removeEventListener('load', measure);
				pictures.splice(pictures.indexOf(img), 1);
			}
		};
	}

	const label = $derived(alt ? `Zoom image: ${alt}` : 'Zoom image');
</script>

{#snippet picture(cls: string)}
	{#if dark}
		<img {src} {alt} {title} class="{cls} dark:hidden" use:track />
		<img src={dark} {alt} {title} class="{cls} hidden dark:inline" use:track />
	{:else}
		<img {src} {alt} {title} class={cls} use:track />
	{/if}
{/snippet}

{#snippet frame(cls: string)}
	<!-- not-prose: typography's image margins would push the picture off its frame. -->
	<span class="not-prose relative inline-block max-w-full align-top {cls}">
		{@render picture('m-0 max-w-full h-auto')}
		{#if zoomable}
			<button
				type="button"
				class="absolute inset-0 cursor-zoom-in rounded-[inherit] focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
				aria-label={label}
				onclick={() => (open = true)}
			></button>
		{/if}
	</span>
{/snippet}

{#if figure}
	<figure class="docsmith-figure">
		<!-- A hairline frame, so a screenshot on the page's own colour keeps its edge. -->
		{@render frame('block w-fit mx-auto rounded-md ring-1 ring-border overflow-hidden')}
		{#if caption}
			<figcaption class="text-center">{caption}</figcaption>
		{/if}
	</figure>
{:else}
	{@render frame('')}
{/if}

{#if zoomable}
	<Dialog.Root bind:open>
		<!-- w-max: a fixed box centred with left: 50% would otherwise shrink to the
		     half of the viewport right of its left edge, and never zoom in. -->
		<Dialog.Content
			class="w-max max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)] p-2 pt-12 gap-2 bg-background"
		>
			<Dialog.Title class="sr-only">{alt || 'Image'}</Dialog.Title>
			{#if dark}
				<img
					{src}
					{alt}
					class="mx-auto max-h-[80vh] max-w-full w-auto h-auto rounded-md dark:hidden"
				/>
				<img
					src={dark}
					{alt}
					class="mx-auto max-h-[80vh] max-w-full w-auto h-auto rounded-md hidden dark:block"
				/>
			{:else}
				<img {src} {alt} class="mx-auto max-h-[80vh] max-w-full w-auto h-auto rounded-md" />
			{/if}
			{#if caption}
				<p class="text-center text-sm text-muted-foreground px-2 pb-1">{caption}</p>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
{/if}
