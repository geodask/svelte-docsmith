---
title: Video
description: Video files with a poster and captions, looping clips in place of GIFs, and YouTube that loads on play.
section: Components
order: 23
---

<script>
	import { Video, PropsTable } from 'svelte-docsmith';
	import videoProps from '$docsmith/components/docs/video.svelte?props';
	import installTabs from './install-tabs.mp4';
	import installTabsPoster from './install-tabs.jpg';
	import installTabsCaptions from './install-tabs.vtt?url';
</script>

`Video` plays a video file with the browser's own controls, a poster frame
and optional captions. It can also loop a short clip like a GIF, or play a
YouTube video that loads only when the reader presses play.

<Video
	src={installTabs}
	poster={installTabsPoster}
	captions={installTabsCaptions}
	title="Switching an install block between package managers"
/>

## Video files

Import the file from next to the page, so Vite copies it into the build, and
pass it as `src`. A file in `static/` or on another server works as a path or
URL. `poster` is the picture shown before the video plays, and `captions`
takes a `.vtt` file, which needs the `?url` suffix when it's imported.

```svelte
<script>
	import { Video } from 'svelte-docsmith';
	import demo from './demo.mp4';
	import poster from './demo.jpg';
	import captions from './demo.vtt?url';
</script>

<Video src={demo} {poster} {captions} title="Creating a new project" />
```

`title` says what the video shows. Screen readers read it, and a YouTube
video's frame takes it as its title. Captions are in English unless
`captionsLang` says otherwise.

## Looping clips

`loop` plays a clip the way a GIF would: muted, looping, with no controls. A
video file is far smaller than the same GIF and stays sharp. A pause button
shows on hover and keyboard focus, so a reader can stop it.

<Video src={installTabs} poster={installTabsPoster} title="Switching an install block between package managers" loop />

```svelte
<Video src={demo} {poster} title="Switching tabs" loop />
```

When the reader has asked their system for less motion, the clip doesn't
start on its own. It waits on its poster with a play button.

## YouTube

Give `src` a YouTube link and the video shows YouTube's thumbnail with a play
button. Nothing from YouTube's player loads until the reader presses play.
The video then plays from `youtube-nocookie.com`, which sets no cookies until
it plays. Watch links, `youtu.be` links, Shorts and embed links all work, and a
start time in the link (`?t=90`) is kept. Shorts are shown upright.

<Video src="https://www.youtube.com/watch?v=rv3Yq-B8qp4" title="Svelte in 100 Seconds, by Fireship" />

```svelte
<Video
	src="https://www.youtube.com/watch?v=rv3Yq-B8qp4"
	title="Svelte in 100 Seconds, by Fireship"
/>
```

`poster` replaces the thumbnail with a picture of your own, which also means
the page asks YouTube for nothing at all until play. `loop` and `captions` are
for video files only.

## API reference

<PropsTable of={videoProps} />
