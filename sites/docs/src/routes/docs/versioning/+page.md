---
title: Versioning
description: Keep the docs for older releases live, with a version switcher and version-scoped navigation.
section: Core Concepts
order: 12
---

<script>
	import { Callout } from 'svelte-docsmith';
</script>

## Why version your docs

Ship a breaking major and two readers need different things: the one still on
the old release needs its docs, and the one on the new release should not trip
over stale pages. Versioning keeps the old release live at its own URL, scopes
the sidebar and search to the version being read, and steers visitors who land
on an archived page to the current one.

It is opt-in, and it is designed so that turning it on changes nothing. Your
current docs stay exactly where they are.

## The model

The **current version** is the docs for your latest release. It lives at your
docs root and is served unprefixed, so `/docs/theming` is `/docs/theming`
forever. It is also the only version you edit.

An **archived version** is a frozen copy of the docs for a superseded release,
served under its own prefix at `/docs/v1/theming`. You never edit an archive.
You create one at the moment you ship a breaking release, and then carry on
editing the docs root.

That means adopting versioning never moves a URL, and shipping a new release
never moves one either. Only the archive is new.

```text
src/routes/docs/
  introduction/+page.md      →  /docs/introduction   (current)
  theming/+page.md           →  /docs/theming        (current)
  v1/introduction/+page.md   →  /docs/v1/introduction (archived)
```

## Declare your versions

Versions live in the `docsmith()` Vite plugin, because it scans them at build
time to tag each page.

```ts
// vite.config.ts
import { docsmith } from 'svelte-docsmith/vite';

export default defineConfig({
	plugins: [
		docsmith({
			versions: {
				current: { id: 'v2', label: 'v2' },
				archived: [{ id: 'v1', label: 'v1' }]
			}
		})
		// tailwindcss(), sveltekit()
	]
});
```

Each archived version's `id` is both its folder name under your docs directory
and its URL prefix. The current version has no folder of its own: its pages are
the ones that are not inside an archive.

Declaring only `current` is perfectly valid, and is how you start. Nothing
renders differently until the first archive exists.

### What makes a valid id

An id has to start with a letter or a digit, and can then hold letters, digits,
`.`, `-` and `_`. So `v1`, `v1.0`, `2.x` and `next` are all fine, while
`../evil`, `.hidden` and `api/v1` are rejected at build time.

The rule applies to `current` as well as to archives, even though the current
version's id never appears in a URL. Archiving turns today's current id into an
archive folder, so an id that was legal only as `current` would fail one release
later.

## When the config and your folders disagree

Versions are declared by hand, so your config and your docs folder are two
separate claims about which versions exist. The build checks that they agree and
fails if they do not, because neither mismatch shows up in the output: an
archive the config does not know about gets merged into your current docs, and a
section folder wrongly declared as a version disappears from your current
sidebar.

Telling the two apart takes a marker. `archive-version` writes a
`.docsmith-archive` file into every archive it creates, and the build reads it.
A folder under your docs root is an archive when it has that file and is
declared in `versions`. Any other combination is an error:

| On disk        | In `versions` | Result                           |
| -------------- | ------------- | -------------------------------- |
| Has the marker | Declared      | Served as an archived version    |
| Has the marker | Not declared  | Build fails: undeclared archive  |
| No marker      | Declared      | Build fails: not an archive      |
| No marker      | Not declared  | An ordinary section of your docs |

<Callout variant="note" title="Copying an archive by hand">

If you create an archive folder yourself rather than with `archive-version`, add
an empty `.docsmith-archive` file inside it. Without one the build treats it as
part of your current docs and refuses to accept it as a version.

</Callout>

## Wire it into the shell

The plugin emits a `versions` manifest next to your content. Pass both to
`DocsShell`.

```svelte
<!-- src/routes/docs/+layout.svelte -->
<script>
	import { docs, versions } from 'svelte-docsmith/content';
	import { DocsShell } from 'svelte-docsmith';
	import { siteConfig } from '$lib/site-config';

	let { children } = $props();
</script>

<DocsShell
	config={siteConfig}
	content={docs}
	{versions}
	search={() => import('svelte-docsmith/search').then((m) => m.docs)}
>
	{@render children()}
</DocsShell>
```

That is the whole wiring. No redirect, no route changes. `DocsShell` reads the
active version from the URL and scopes the sidebar, search, prev/next, and
breadcrumbs to it.

If you use [`ErrorPage`](/docs/configuration#errorpage), pass it `versions` too.
A 404 under an archived prefix then keeps that version's search scope and its
`noindex`, instead of falling back to the current version.

## What readers get

Once at least one archive exists, a **version switcher** appears in the header.
It keeps readers on the same page when they switch, falling back to that
version's home when the page has no equivalent there.

On an archived version, a **banner** tells readers what they are looking at and
links to the current equivalent. Archived pages also drop their "Edit this page"
link, since the archive is frozen.

## Search engines see one version

Archived docs should not compete with the current release in search results, but
they are real content people still look for. So archives stay indexable with a
self-canonical, while `sitemap.xml` and `llms.txt` list the current version
only. Scope those endpoints with `currentOnly`:

```ts
// src/routes/sitemap.xml/+server.ts
import { docs, versions } from 'svelte-docsmith/content';
import { generateSitemap, currentOnly } from 'svelte-docsmith';
import { siteConfig } from '$lib/site-config';

export function GET() {
	const body = generateSitemap(siteConfig.url ?? '', [
		{ path: '/' },
		...currentOnly(docs, versions).map((d) => ({ path: d.path, lastmod: d.lastUpdated }))
	]);
	return new Response(body, { headers: { 'content-type': 'application/xml' } });
}
```

To keep a version out of search engines entirely, set `noindex: true` on it.

## Archive a release

When you ship a breaking release, freeze the docs that described the old one:

```bash
npx svelte-docsmith archive-version v1 --label v1
```

This copies your current docs into `v1/`, and does three things a plain copy
would get wrong. It rewrites in-content links so they stay inside the archive,
because an absolute link like `](/docs/theming)` would otherwise keep pointing
at your newest docs. It writes each page's real last-updated date into its
frontmatter, so the archive does not claim every page changed on the day you
created it. And it marks the folder as an archive.

Review the diff, then update your config to serve the archive and rename the
current version:

```ts
versions: {
	current: { id: 'v2', label: 'v2' },
	archived: [{ id: 'v1', label: 'v1' }]
}
```

Until you paste that in, the build fails and reports the new archive as
undeclared. That is deliberate: it is the reminder, and it arrives while you are
still looking at the terminal. The command prints the block to paste.

## What archives cost

Worth knowing before you keep many of them around:

- Archived pages are compiled by your current setup, so a breaking change to a
  docs component changes how every archive renders.
- Each archive adds its pages to the content index and its text to the search
  index, both of which grow linearly with the number of versions you keep.
- Archive folders are real files in your repo, permanently.

Keeping one or two archives is cheap. Keeping ten is a decision worth making
deliberately.
