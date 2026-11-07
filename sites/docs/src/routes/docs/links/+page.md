---
title: Links
description: Broken links fail the build, and outside paths tell DocSmith what a Worker or proxy serves.
section: Core Concepts
order: 14
---

<script>
	import { Callout } from 'svelte-docsmith';
</script>

DocSmith checks the links your doc pages write. A link to a docs path with no
page behind it, or to an anchor the page doesn't have, fails `vite build` with
one report of every such link, so a typo never ships. And when something other
than your SvelteKit app serves some of your site's paths, such as a Worker or a
reverse proxy, you declare them as outside paths, and DocSmith stops calling
links to them broken and keeps SvelteKit from crawling them.

Both live in one group of the `docsmith()` options:

```ts title="vite.config.ts"
docsmith({
	site: { title: 'My Library' },
	links: {
		broken: 'error', // the default; or 'warn', or 'ignore'
		outside: ['/playground'] // paths something else serves
	}
});
```

You need neither to get the check. It is on by default.

## What counts as a broken link

A link is checked when it points at a path under your docs base (`/docs` for
pages in `src/routes/docs`). It is broken when:

- **No page lives there.** `[Theming](/docs/theeming)` is reported as
  `no page at /docs/theeming`.
- **The page has no such anchor.** `[llms.txt](/docs/seo#llms-txt)` is reported
  with the anchors `/docs/seo` does have, so you can pick the right one. A
  same-page link like `[Versions](#versions)` is checked against the page it is
  written on.

Both forms of link are checked: markdown `[text](href)` and a raw
`<a href="...">` written in the page. Relative links (`./theming`, `../intro`)
resolve against the page's own URL first, as a browser would.

A page is any route SvelteKit serves under your docs directory: every
`+page.md`, with or without a `title`, and any `+page.svelte` beside them. An
anchor is the id of any heading on the target page, of any level, as the page
renders it (a repeated heading gets `-1`, `-2`), plus any `id="..."` you write
on an HTML tag in its markdown. `#top` always works. Archived versions are
checked like the rest, so a link to `/docs/v1/intro` holds as long as the v1
archive has that page.

Some differences don't matter. `/docs/intro/`, `/docs/intro?tab=svelte` and
`/docs/intro.md` (the page's [agent markdown](/docs/seo#copy-page) twin) are
all valid links to `/docs/intro`.

### What the check leaves alone

- **Links outside the docs base**, like `/`, `/changelog` or `/llms.txt`. Those
  routes belong to the rest of your app, and DocSmith doesn't guess about them.
- **Other origins**: anything with a scheme (`https:`, `mailto:`) or starting
  with `//`. Nothing is fetched over the network.
- **Links in code**: fenced and indented code blocks and inline code are
  examples, not links.
- **Svelte expressions**, like `href={url}` or `href="/docs/{slug}"`. Their
  value is only known when the page runs.
- **Links outside doc pages**: in your own Svelte components, and in the site
  config's `nav`, footer and announcement.
- **Outside paths**, even under the docs base. See
  [Outside paths](#outside-paths).

## The report

`vite build` prints every broken link at once, grouped by page file, with the
line each one is on, the link as you wrote it, and what is wrong:

```text
[svelte-docsmith] 2 broken links in doc pages
  src/routes/docs/guides/setup/+page.md:14  /docs/theeming  no page at /docs/theeming
  src/routes/docs/guides/setup/+page.md:31  /docs/seo#llms-txt  no anchor #llms-txt on /docs/seo (has: #per-page-from-frontmatter, #site-wide-defaults, #non-doc-pages, #sitemap, #llmstxt, #copy-page)
```

Then the build fails, and its error points at `broken: 'warn'` if you need to
ship anyway. Fix them all in one pass and build again.

## Choose how strict

`links.broken` decides what a broken link does to `vite build`:

| Value      | `vite build`                              |
| ---------- | ----------------------------------------- |
| `'error'`  | Prints the report and fails. The default. |
| `'warn'`   | Prints the same report and builds anyway. |
| `'ignore'` | Skips the check.                          |

Any other value fails when Vite starts, naming the three valid ones.

`vite dev` never fails over a link, whatever the setting, because a link you
are halfway through typing must not break the page you're writing. It prints
the report as a warning at startup and checks again whenever you add, change
or remove a page, so the warning tracks the docs as they are. It only speaks
when the set of broken links changes, and says so once you've fixed the last
one. Under `'ignore'` it stays quiet.

<Callout variant="note" title="Upgrading an existing site">

The check is on by default, so the first build after upgrading can fail on
links that were broken all along. Set `links: { broken: 'warn' }` to build
while you fix them, then remove it.

</Callout>

## Outside paths

Sometimes a path on your site's origin isn't served by your SvelteKit app at
all. A Cloudflare Worker in front of a static build answers some paths itself,
or a reverse proxy routes a prefix to another app. Links to those paths work in
production, but the app knows nothing about them, which causes two problems:

- If the path is under your docs base, DocSmith reports links to it as broken.
- If a page linking to it is prerendered, SvelteKit's crawler follows the link
  during `vite build`, gets a 404 from your app, and fails the build.

Declare those prefixes as outside paths:

```ts title="vite.config.ts"
docsmith({
	site: { title: 'My Library' },
	links: { outside: ['/playground', '/docs/api'] }
});
```

A prefix matches on whole path segments: `/playground` covers `/playground`
and `/playground/anything`, but not `/playgrounds`. A trailing slash is
ignored, so `'/playground/'` means the same. Each prefix must start with `/`;
anything else fails when Vite starts, since it could never match a link.

A link to an outside path is then:

- **Never a broken link**, even under the docs base, so you keep
  `broken: 'error'` for everything else.
- **Marked `rel="external"`** in your doc pages, as markdown links and raw
  `<a>` tags alike. A `rel` you already wrote on an `<a>` is kept, with
  `external` added, so `rel="noopener"` becomes `rel="noopener external"`.
- **Marked the same way in the shell**: `nav`, footer and announcement links
  from your site config whose `href` starts with `/` and falls under an outside
  path render with `rel="external"` too. One that also sets `external: true`
  still opens in a new tab, with `rel="external noopener noreferrer"`.

The [agent markdown](/docs/seo#llmstxt) of a page keeps its links as written:
`rel` is an HTML concern, and agents don't crawl.

### What `rel="external"` does

It is SvelteKit's own signal for "this app doesn't serve that" (see
[link options](https://svelte.dev/docs/kit/link-options#data-sveltekit-reload)
in the SvelteKit docs). Two things follow from it:

- **The crawler skips the link.** During prerendering, SvelteKit doesn't follow
  it, so it can't fail the build with a 404.
- **The client router lets go.** A click does a full page load instead of a
  client-side navigation, so the request reaches your server, and your Worker
  or proxy can answer it rather than the app's 404 page.

<Callout variant="warning" title="No doc page under an outside path">

An outside path says something else serves every URL under it, so a doc page
there is a contradiction. If one exists, `vite build` fails, and `vite dev`
shows the error as soon as a docs page loads, naming the page, its URL and the
prefix. This holds even under `broken: 'ignore'`. Remove the prefix or move the
page.

</Callout>

## Example: a Worker beside a static build

Say your docs are a static SvelteKit build (`adapter-static`) served by
Cloudflare, with a Worker in front that answers `/playground` itself and
hands every other request to the static files:

```ts title="worker.ts"
import { playground } from './playground';

export default {
	async fetch(request, env) {
		const { pathname } = new URL(request.url);
		if (pathname === '/playground' || pathname.startsWith('/playground/')) {
			return playground(request, env);
		}
		return env.ASSETS.fetch(request);
	}
};
```

Your guide links to it in markdown:

```md title="src/routes/docs/getting-started/+page.md"
Try it in the [playground](/playground/hello-world) first.
```

The page is prerendered, so `vite build` crawls it, requests
`/playground/hello-world` from the app, gets a 404 and fails. The link isn't
broken, though: in production the Worker answers it. Turning the check off with
`broken: 'ignore'`, or catching the error in SvelteKit's `handleHttpError`,
would quiet the build, but also hide every real typo in your docs.

Tell DocSmith what the Worker serves instead:

```ts title="vite.config.ts"
docsmith({
	site: { title: 'My Library' },
	links: { outside: ['/playground'] }
});
```

The link now renders as
`<a href="/playground/hello-world" rel="external">`, so the crawler skips it
and the build passes, and a reader's click goes to the Worker. Every other link
is still checked under `broken: 'error'`. A header link to it, like
`nav: [{ label: 'Playground', href: '/playground' }]` in your site config, gets
the same `rel="external"`.

You no longer need to write the raw `<a ... rel="external">` by hand either.
(Attribute syntax like `[playground](/playground){rel=external}` never worked:
the braces are a Svelte expression.)

If the Worker owned a path under your docs base, say `/docs/api`, the same
entry would cover it, and DocSmith would stop reporting links to it as broken
too.
