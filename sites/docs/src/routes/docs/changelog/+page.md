---
title: Changelog
description: Publish your releases as a page and a feed, from the changelog you already have.
section: Core Concepts
order: 12
---

Every release you ship already produces release notes. DocSmith reads them and
publishes them, so the changelog on your site can never fall behind what
actually went out.

## Where the entries come from

The `docsmith()` plugin parses a `CHANGELOG.md` into releases and serves them as
the `svelte-docsmith/changelog` module. The format Changesets writes is what it
expects: an `## <version>` heading per release, `### Minor Changes` style
groups, and one bullet per entry. Commit hashes are stripped, multi-paragraph
entries survive intact, and each entry's markdown is rendered to HTML at build
time so your site needs no runtime markdown renderer.

Release dates come from git: the commit that first introduced each version's
heading. No date is invented when the history is unavailable.

```ts title="vite.config.ts"
// Defaults to CHANGELOG.md beside your app. In a monorepo, point it at the
// package you actually publish.
docsmith({ site, changelog: { file: '../../packages/my-lib/CHANGELOG.md' } });
```

## Add the page

```svelte title="src/routes/changelog/+page.svelte"
<script>
	import { content } from 'svelte-docsmith/content';
	import { releases } from 'svelte-docsmith/changelog';
	import { DocsShell, Changelog } from 'svelte-docsmith';
</script>

<DocsShell {content} layout="page">
	<Changelog {releases} description="What shipped in each release." />
</DocsShell>
```

## Add the feed

An Atom feed makes each release something readers can subscribe to rather than
something they have to check for.

```ts title="src/routes/changelog.xml/+server.ts"
import { changelogFeed } from 'svelte-docsmith/server';

export const prerender = true;
export const GET = changelogFeed();
```

The feed takes its title, description and `url` from your `site` options, and
links to the changelog page at `changelog.path` (default `'/changelog'`), the
same route the plugin finds hand-written release pages under.

Atom rather than RSS, because it requires an unambiguous id and timestamp per
entry, which a version and its release date give exactly.

## Write a proper post for a release

Generated entries are terse by design. When a release deserves more, add
`src/routes/changelog/<version>/` as a normal page and DocSmith links the
release to it instead of to its anchor. Dots are awkward in directory names, so
`0-9-0` works as well as `0.9.0`. Every other release stays generated, so
nothing goes undocumented while you write up the ones that matter.
