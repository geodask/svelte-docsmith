---
title: Image
description: Zoomable images with captions, kept next to the page, with a picture per colour mode.
section: Components
order: 17
---

<script>
	import { Image, PropsTable } from 'svelte-docsmith';
	import imageProps from '$docsmith/components/docs/image.svelte?props';
	import homeLight from './home-light.png';
	import homeDark from './home-dark.png';
</script>

Plain markdown images already do the useful things: keep the file next to the
page, click to zoom when the picture is shown smaller than its real size, and
show a caption. For a different picture in dark mode, use the `Image`
component.

![The Svelte DocSmith home page](./home-light.png 'The home page, shown smaller than its real size: click it to zoom.')

## Markdown images

Write an image as you always would. The title, in quotes after the path,
becomes the caption.

```md
![The Svelte DocSmith home page](./home-light.png 'The home page.')
```

An image that sits on its own line is drawn as a figure, centred, with its
caption below. An image inside a sentence stays inline, and its title is a
hint on hover.

### Images next to the page

A path that starts with `./` or `../` is a file next to the page:

```txt
src/routes/docs/guide/
├── +page.md
└── screenshot.png
```

```md
![The settings screen](./screenshot.png)
```

DocSmith imports the file, so Vite copies it into the build with a hashed name
and the page always points at the right file. If the file isn't there, the
build fails and names the page and the path, the same as a
[broken link](/docs/links).

Paths that start with `/` are files in `static/`, and full URLs are other
sites. Both are left as you wrote them.

### Zoom

When a picture is shown smaller than its real size, it becomes a button that
opens it full size. A picture that already fits has nothing more to show, so it
stays a plain image. Zoom works with the keyboard, and Escape closes it. An image inside a link never zooms: clicking it follows the link.

## A picture per colour mode

`Image` takes a second picture for dark mode. Readers see the one that matches
their colour mode, with no flash when the page loads.

<Image
	src={homeLight}
	dark={homeDark}
	alt="The Svelte DocSmith home page"
	caption="Switch the colour mode to see the other picture."
/>

```svelte
<script>
	import { Image } from 'svelte-docsmith';
	import homeLight from './home-light.png';
	import homeDark from './home-dark.png';
</script>

<Image
	src={homeLight}
	dark={homeDark}
	alt="The Svelte DocSmith home page"
	caption="Switch the colour mode to see the other picture."
/>
```

Import the files yourself: inside a component, a path next to the page is only
resolved for plain markdown images.

## API reference

<PropsTable of={imageProps} />
