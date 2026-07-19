---
title: SEO
description: Titles, meta descriptions, and social cards from your frontmatter.
section: Core Concepts
order: 10
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

## Sitemap

`generateSitemap` builds a `sitemap.xml` from your content index. Add a
`src/routes/sitemap.xml/+server.ts`:

```ts title="src/routes/sitemap.xml/+server.ts"
import { docs } from 'svelte-docsmith/content';
import { generateSitemap } from 'svelte-docsmith';
import { siteConfig } from '$lib/site-config';

export const prerender = true;

export function GET() {
	const body = generateSitemap(siteConfig.url ?? '', [
		{ path: '/' },
		...docs.map((d) => ({ path: d.path, lastmod: d.lastUpdated }))
	]);
	return new Response(body, { headers: { 'content-type': 'application/xml' } });
}
```

Each entry gets a `<lastmod>` from the page's last git commit. Then point
crawlers at it from `static/robots.txt`:

```txt
User-agent: *
Allow: /

Sitemap: https://your-docs.dev/sitemap.xml
```

## llms.txt

The [llms.txt](https://llmstxt.org) standard gives AI tools a clean, plain-text
view of your docs. Svelte DocSmith generates the data at build time in the
`svelte-docsmith/llms` module, and two helpers turn it into the two files the
standard defines: `llms.txt` (a curated index of links) and `llms-full.txt`
(the full text of every page).

Add `src/routes/llms.txt/+server.ts`:

```ts title="src/routes/llms.txt/+server.ts"
import { docs } from 'svelte-docsmith/llms';
import { generateLlmsTxt } from 'svelte-docsmith';
import { siteConfig } from '$lib/site-config';

export const prerender = true;

export function GET() {
	const body = generateLlmsTxt(
		{ title: siteConfig.title, description: siteConfig.description, origin: siteConfig.url },
		docs
	);
	return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
```

And `src/routes/llms-full.txt/+server.ts`, identical but for `generateLlmsFullTxt`:

```ts title="src/routes/llms-full.txt/+server.ts"
import { docs } from 'svelte-docsmith/llms';
import { generateLlmsFullTxt } from 'svelte-docsmith';
import { siteConfig } from '$lib/site-config';

export const prerender = true;

export function GET() {
	const body = generateLlmsFullTxt(
		{ title: siteConfig.title, description: siteConfig.description, origin: siteConfig.url },
		docs
	);
	return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
```

Both follow your sidebar reading order, grouping pages by `section` and sorting
by `order`. Each page's title becomes an `h1`, and its `description` frontmatter
annotates the link in the index.

<Callout variant="tip">

You are reading these docs through this exact pipeline. Open
[/llms.txt](/llms.txt) and [/llms-full.txt](/llms-full.txt) to see the output.

</Callout>

## Copy page

The same per-page markdown powers a "Copy page" button on every doc page. Turn
it on with the `copyPage` prop on `DocsShell`:

```svelte
<DocsShell {config} content={docs} copyPage>
	{@render children()}
</DocsShell>
```

The split button copies the page as Markdown, and its dropdown links to the raw
`.md`, or opens the page in ChatGPT or Claude. It expects each page to be
available at `<path>.md`, so add one catch-all endpoint,
`src/routes/[...slug].md/+server.ts`:

```ts title="src/routes/[...slug].md/+server.ts"
import { docs } from 'svelte-docsmith/llms';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
	docs.map((doc) => ({ slug: doc.path.replace(/^\//, '') }));

export const GET: RequestHandler = ({ params }) => {
	const doc = docs.find((d) => d.path === `/${params.slug}`);
	if (!doc) error(404, 'Not found');
	return new Response(doc.content, {
		headers: { 'content-type': 'text/markdown; charset=utf-8' }
	});
};
```

<Callout variant="tip">

Try it: the "Copy page" button at the top of this page, or open
[this page as Markdown](/docs/seo.md).

</Callout>
