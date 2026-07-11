---
title: SEO
description: Titles, meta descriptions, and social cards from your frontmatter.
section: Core Concepts
order: 9
---

<script>
	import { Callout } from 'svelte-docsmith';
</script>

`DocsShell` writes the head tags for every page (`<title>`, meta description,
canonical URL, and Open Graph / Twitter Card tags) with no per-page wiring. Doc
pages get theirs straight from frontmatter.

## Per-page, from frontmatter

A page's `title` becomes `Page · Site Title`, and its `description` becomes the
meta and social description. You already write both to drive the sidebar, so
there is nothing extra to add:

```md
---
title: Installation
description: Add Svelte DocSmith to a SvelteKit project.
section: Getting Started
order: 2
---
```

## Site-wide defaults

Set the defaults once in your `DocsmithConfig`. `url` is the piece that unlocks
absolute links (a canonical `<link>` and absolute `og:url`/image), so search
engines and social scrapers resolve them correctly:

```ts
export const siteConfig = defineConfig({
	title: 'My Library',
	description: 'A short tagline, used when a page has no description.',
	url: 'https://my-library.dev',
	ogImage: '/og.png' // absolute, or resolved against `url`
});
```

| Field         | Used for                                                             |
| ------------- | -------------------------------------------------------------------- |
| `description` | Default meta description for pages without their own                 |
| `url`         | Canonical origin; enables `<link rel="canonical">` and absolute URLs |
| `ogImage`     | Default social-share image                                           |

<Callout variant="note" title="A canonical URL needs an origin">

Without `url`, DocSmith can't build an absolute address, so it omits the
canonical and `og:url` tags rather than emit a wrong one. Set `url` to your
deployed origin to turn them on.

</Callout>

## Non-doc pages

Pages that aren't markdown (a landing page, a custom route) have no
frontmatter, so pass the `seo` prop to set or override the head:

```svelte
<DocsShell
	{config}
	layout="page"
	seo={{ title: 'Themes', description: 'Preview the built-in themes.' }}
>
	{@render children()}
</DocsShell>
```
