<script lang="ts" module>
	/** A YouTube video: its id, where to start, and whether it is a Short. */
	export type YouTubeVideo = { id: string; start?: number; short: boolean };

	const YOUTUBE_HOSTS = /^(?:www\.|m\.)?(?:youtube\.com|youtube-nocookie\.com)$/;
	const VIDEO_ID = /^[\w-]{11}$/;

	/**
	 * The YouTube video a link names: a watch, short, Shorts or embed link.
	 * Anything else is `undefined`, and is played as a file.
	 */
	export function youtubeVideo(src: string): YouTubeVideo | undefined {
		let url: URL;
		try {
			url = new URL(src);
		} catch {
			return undefined;
		}
		let id: string | undefined;
		let short = false;
		if (url.hostname === 'youtu.be') {
			id = url.pathname.slice(1);
		} else if (YOUTUBE_HOSTS.test(url.hostname)) {
			const [kind, value] = url.pathname.split('/').filter(Boolean);
			if (kind === 'watch') id = url.searchParams.get('v') ?? undefined;
			else if (kind === 'embed' || kind === 'live') id = value;
			else if (kind === 'shorts') [id, short] = [value, true];
		}
		if (!id || !VIDEO_ID.test(id)) return undefined;
		const start = seconds(url.searchParams.get('t') ?? url.searchParams.get('start'));
		return { id, short, ...(start ? { start } : {}) };
	}

	/** `90`, `90s` or `1m30s` as seconds. */
	function seconds(value: string | null): number | undefined {
		const match = value && /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(value);
		if (!match) return undefined;
		const [, h = '0', m = '0', s = '0'] = match;
		return Number(h) * 3600 + Number(m) * 60 + Number(s) || undefined;
	}
</script>

<script lang="ts">
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';

	const {
		src,
		title,
		poster,
		captions,
		captionsLang = 'en',
		loop = false
	}: {
		/** A video file, or a YouTube link (watch, short, Shorts or embed). */
		src: string;
		/** What the video shows, for screen readers and as the YouTube frame's title. */
		title: string;
		/**
		 * The picture shown before the video plays.
		 * @default YouTube's thumbnail for a YouTube link
		 */
		poster?: string;
		/** A `.vtt` captions file, for a video file. */
		captions?: string;
		/** The language of the captions. */
		captionsLang?: string;
		/**
		 * Play a video file like a GIF: muted, looping, with no controls. Under
		 * reduced motion it waits on the poster until the reader presses play.
		 */
		loop?: boolean;
	} = $props();

	const youtube = $derived(youtubeVideo(src));

	// YouTube: nothing from the player loads until the reader presses play.
	let embedded = $state(false);
	const embed = $derived(
		youtube &&
			`https://www.youtube-nocookie.com/embed/${youtube.id}?autoplay=1` +
				(youtube.start ? `&start=${youtube.start}` : '')
	);
	const thumbnail = $derived(
		poster ?? (youtube && `https://i.ytimg.com/vi/${youtube.id}/hqdefault.jpg`)
	);

	// A loop: starts playing once the page runs, unless the reader asked for
	// less motion. Rendered paused, so reduced motion never sees a frame move.
	// `paused` follows the element's events: a bind:paused would pause the clip
	// again as it hydrates.
	let clip = $state<HTMLVideoElement>();
	let paused = $state(true);

	function startLoop(video: HTMLVideoElement) {
		video.muted = true;
		if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
			video.play()?.catch(() => {});
		}
	}

	function toggle() {
		if (!clip) return;
		if (clip.paused) clip.play()?.catch(() => {});
		else clip.pause();
	}
</script>

{#if youtube}
	<div
		class="docsmith-video not-prose relative my-6 overflow-hidden rounded-md bg-black ring-1 ring-border {youtube.short
			? 'mx-auto aspect-[9/16] max-h-[80vh] max-w-xs'
			: 'aspect-video w-full'}"
	>
		{#if embedded}
			<iframe
				src={embed}
				{title}
				class="absolute inset-0 h-full w-full border-0"
				allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
				allowfullscreen
				referrerpolicy="strict-origin-when-cross-origin"
			></iframe>
		{:else}
			<button
				type="button"
				class="group absolute inset-0 h-full w-full cursor-pointer focus-visible:outline-hidden"
				aria-label="Play video: {title}"
				onclick={() => (embedded = true)}
			>
				<img src={thumbnail} alt="" class="h-full w-full object-cover" loading="lazy" />
				{@render playMark()}
			</button>
		{/if}
	</div>
{:else if loop}
	<div class="docsmith-video not-prose group/video relative my-6 w-fit max-w-full">
		<video
			bind:this={clip}
			onplay={() => (paused = false)}
			onpause={() => (paused = true)}
			{src}
			{poster}
			aria-label={title}
			class="block h-auto max-w-full rounded-md ring-1 ring-border"
			muted
			loop
			playsinline
			preload="metadata"
			use:startLoop
		>
			{#if captions}
				<track kind="captions" src={captions} srclang={captionsLang} />
			{/if}
		</video>
		{#if paused}
			<button
				type="button"
				class="group absolute inset-0 cursor-pointer rounded-md focus-visible:outline-hidden"
				aria-label="Play video: {title}"
				onclick={toggle}
			>
				{@render playMark()}
			</button>
		{:else}
			<!-- Moving pictures need a way to stop them. -->
			<button
				type="button"
				class="absolute right-2 bottom-2 grid size-8 cursor-pointer place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover/video:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
				aria-label="Pause video: {title}"
				onclick={toggle}
			>
				<Pause size={14} fill="currentColor" aria-hidden="true" />
			</button>
		{/if}
	</div>
{:else}
	<!-- Captions are the author's to give. -->
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		{src}
		{poster}
		aria-label={title}
		class="docsmith-video not-prose my-6 block h-auto max-w-full rounded-md ring-1 ring-border"
		controls
		playsinline
		preload="metadata"
	>
		{#if captions}
			<track kind="captions" src={captions} srclang={captionsLang} />
		{/if}
	</video>
{/if}

{#snippet playMark()}
	<span
		class="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white shadow-lg transition-transform group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2"
		aria-hidden="true"
	>
		<Play size={22} fill="currentColor" class="ml-0.5" />
	</span>
{/snippet}
