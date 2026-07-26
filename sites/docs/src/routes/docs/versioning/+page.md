---
title: Versioning
description: Publish docs for every release, with a version switcher and version-scoped navigation.
section: Core Concepts
order: 12
---

## Why version your docs

Ship a breaking major and two readers need different things: the one still on
the old release needs its docs, and the one on the new release should not trip
over stale pages. Versioning keeps every release live at its own URL, scopes the
sidebar and search to the version being read, and steers visitors who land on an
old page to the current one. It is opt-in. Declare no versions and your docs
stay a single tree, exactly as before.

## Declare your versions

Versions live in the `docsmith()` Vite plugin, because it scans them at build
time to tag each page. Every version is a folder under your docs directory and
is served with a matching URL prefix. One version is the `latest` release
readers get by default; another can be an unreleased `next`.

```ts
// vite.config.ts
import { docsmith } from 'svelte-docsmith/vite';

export default defineConfig({
	plugins: [
		docsmith({
			versions: [
				{ id: 'next', label: 'v3 (next)', path: 'next', prerelease: true },
				{ id: 'v2', label: 'v2', path: 'v2', latest: true },
				{ id: 'v1', label: 'v1', path: 'v1' }
			]
		})
		// tailwindcss(), sveltekit()
	]
});
```

Each page then lives under its version's folder, and its URL carries the prefix:

```text
src/routes/docs/
  next/ introduction/+page.md   →  /docs/next/introduction   (unreleased)
  v2/   introduction/+page.md   →  /docs/v2/introduction     (latest)
  v1/   introduction/+page.md   →  /docs/v1/introduction     (archived)
```

Each version's sidebar is derived from that version's own frontmatter, so
different releases can have entirely different structures with no extra config.

## Wire it into the shell

The plugin emits a `versions` manifest next to your content. Pass both to
`DocsShell`, and redirect the bare `/docs` to the latest release.

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

```ts
// src/routes/docs/+page.ts — send the bare /docs to the latest release
import { redirect } from '@sveltejs/kit';
import { versions } from 'svelte-docsmith/content';
import { latestLandingUrl } from 'svelte-docsmith';

export const load = () => redirect(307, latestLandingUrl(versions) ?? '/');
```

That is the whole wiring. `DocsShell` reads the active version from the URL and
scopes the sidebar, search, prev/next, and breadcrumbs to it.

Point your entry links at `/docs`, not a specific page. Your header nav link and
any landing-page call to action should target `/docs` so they follow the redirect
to the latest version. A hardcoded `/docs/introduction` would 404 once that page
moves under a version folder.

## What readers get

A **version switcher** in the header lists every version and keeps readers on
the same page when they switch, falling back to that version's home when the
page has no equivalent there. On any version that is not the latest, a **banner**
says what they are looking at and links to the current equivalent: a warning on
an archived version, an unreleased notice on `next`.

## Search engines see one version

Old and unreleased docs should not compete with the current release in search
results, but old docs are real content people still look for. So archived
versions stay indexable with a self-canonical, a `prerelease` version gets
`noindex`, and `sitemap.xml` and `llms.txt` list the latest release only. Scope
those endpoints with `latestOnly`:

```ts
// src/routes/sitemap.xml/+server.ts
import { docs, versions } from 'svelte-docsmith/content';
import { generateSitemap, latestOnly } from 'svelte-docsmith';
import { siteConfig } from '$lib/site-config';

export function GET() {
	const body = generateSitemap(siteConfig.url ?? '', [
		{ path: '/' },
		...latestOnly(docs, versions).map((d) => ({ path: d.path, lastmod: d.lastUpdated }))
	]);
	return new Response(body, { headers: { 'content-type': 'application/xml' } });
}
```

## Cut a new version

You edit `next` continuously. When you release it, freeze a snapshot so the old
docs stay put while `next` moves on to the following release:

```bash
npx svelte-docsmith cut-version v3 --label v3
```

This copies `next/` into a frozen `v3/` folder and prints the `versions` entry to
paste. Mark the new snapshot `latest`, drop `latest` from the version it
replaces, and keep editing `next` for whatever comes next.
