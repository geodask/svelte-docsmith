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

Set the defaults once in the `site` options of `docsmith()`. `url` is the piece that unlocks
absolute links (a canonical `<link>` and absolute `og:url`/image), so search
engines and social scrapers resolve them correctly:

```ts title="vite.config.ts"
docsmith({
	site: {
		title: 'My Library',
		description: 'A short tagline, used when a page has no description.',
		url: 'https://my-library.dev',
		ogImage: '/og.png' // absolute, or resolved against `url`
	}
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
	{content}
	layout="page"
	seo={{ title: 'Themes', description: 'Preview the built-in themes.' }}
>
	{@render children()}
</DocsShell>
```

## Sitemap

`sitemap()` from `svelte-docsmith/server` serves a `sitemap.xml` of every docs
page. List the pages outside your docs, such as the landing page, in `extra`.
Add a `src/routes/sitemap.xml/+server.ts`:

```ts title="src/routes/sitemap.xml/+server.ts"
import { sitemap } from 'svelte-docsmith/server';

export const prerender = true;
export const GET = sitemap({ extra: [{ path: '/' }] });
```

Links are absolute when your `site` options set `url`. On a
[versioned](/docs/versioning) site only the current version's pages are listed,
so archived releases don't compete with it in search results.

Each entry gets a `<lastmod>` from the page's last git commit — or none, when
the page has no date (no frontmatter `lastUpdated`, and git could not supply
one). On a **shallow clone** (the default for `actions/checkout` and many
hosts), DocSmith omits every git-derived date rather than stamp every page with
the same build day, which would teach crawlers to ignore the field. Build from a
full history (`fetch-depth: 0` in GitHub Actions) when you want real
`<lastmod>` values, or set `lastUpdated` in frontmatter on pages that need one.

Then point crawlers at the sitemap from `static/robots.txt`:

```txt
User-agent: *
Allow: /

Sitemap: https://your-docs.dev/sitemap.xml
```

## llms.txt

The [llms.txt](https://llmstxt.org) standard gives AI tools a clean, plain-text
view of your docs. Svelte DocSmith generates the data at build time in the
`svelte-docsmith/llms` module, and two route handlers from
`svelte-docsmith/server` serve the two files the standard defines: `llms.txt`
(a curated index of links) and `llms-full.txt` (the full text of every page).

Add `src/routes/llms.txt/+server.ts`:

```ts title="src/routes/llms.txt/+server.ts"
import { llmsTxt } from 'svelte-docsmith/server';

export const prerender = true;
export const GET = llmsTxt();
```

And `src/routes/llms-full.txt/+server.ts`, identical but for `llmsFullTxt`:

```ts title="src/routes/llms-full.txt/+server.ts"
import { llmsFullTxt } from 'svelte-docsmith/server';

export const prerender = true;
export const GET = llmsFullTxt();
```

Both take the title, description and `url` from your `site` options, and keep
to the current version on a versioned site. When `site.mcp` is set, `llms.txt`
also tells agents where your [MCP server](/docs/mcp-server) is.

Both follow your sidebar reading order exactly: the same groups, sorted by
`order` and then title. `llms.txt` can't nest, so a nested section gets its own
heading, such as `Guides / Advanced`, right after its parent. Each page's
title becomes an `h1`, and its `description` frontmatter annotates the link in
the index.

Each page's text is its agent markdown: the page as a coding agent should read
it. A generated props table is written out as a markdown table, under a heading
with the component's name. Each `LiveExample` is written out as its source, in a
`svelte` code block. Hand-written props tables stay as you wrote them. This is
experimental, like [generated props tables](/docs/components/props-table).

To let agents search your docs and read one page at a time instead of the whole
file, add an [MCP server](/docs/mcp-server).

<Callout variant="tip">

You are reading these docs through this exact pipeline. Open
[/llms.txt](/llms.txt) and [/llms-full.txt](/llms-full.txt) to see the output.

</Callout>

## Copy page

The same per-page markdown powers a "Copy page" button on every doc page. Turn
it on with the `copyPage` prop on `DocsShell`:

```svelte
<DocsShell {content} copyPage>
	{@render children()}
</DocsShell>
```

The split button copies the page as Markdown, and its dropdown links to the raw
`.md`, or opens the page in ChatGPT or Claude. All of them use the page's agent
markdown, props tables and example code included. With an
[MCP server](/docs/mcp-server) and `mcp` set in your `site` options, the dropdown also
offers "Connect to your editor". The button expects each page to be
available at `<path>.md`, so add one catch-all endpoint,
`src/routes/[...slug].md/+server.ts`. Export both: `entries` lists every page,
archived versions included, so the twins prerender even when nothing links to
them.

```ts title="src/routes/[...slug].md/+server.ts"
import { agentMarkdown } from 'svelte-docsmith/server';

export const prerender = true;
export const { GET, entries } = agentMarkdown();
```

<Callout variant="tip">

Try it: the "Copy page" button at the top of this page, or open
[this page as Markdown](/docs/seo.md).

</Callout>
