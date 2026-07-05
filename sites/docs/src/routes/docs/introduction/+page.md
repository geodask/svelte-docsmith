---
title: Introduction
description: What Svelte DocSmith is and who it is for.
section: Getting Started
order: 1
---

<script>
	import { Card, CardGrid } from 'svelte-docsmith';
	import Rocket from '@lucide/svelte/icons/rocket';
	import BookOpen from '@lucide/svelte/icons/book-open';
</script>

## What is Svelte DocSmith?

Svelte DocSmith is a framework for building documentation sites with Svelte 5
and SvelteKit. Your interactive examples live inside one real, stateful app.
They are not sandboxed as isolated islands, and not screenshots of a component
that used to work.

You write markdown; DocSmith gives you the pipeline that turns it into styled,
navigable, syntax-highlighted pages, and lets you drop live Svelte components
straight into the prose.

## Why another docs tool?

Most Svelte docs are written by hand or bolted onto a general-purpose static
site generator. Either way you end up maintaining a navigation tree, wiring up a
markdown pipeline, and rebuilding the same layout every project. DocSmith gives
you the pipeline, the layout, and the navigation out of the box, so you can
focus on the content.

And because a page is a real SvelteKit route, an example in your docs is the
same component your users import: running, stateful, and impossible to let rot.

## Highlights

- **Markdown as routes.** `.md` files compile to real Svelte components via
  mdsvex. No loader, no catch-all route.
- **Live examples.** Drop a component into a page; it runs, and its source is
  shown from the same file, so the two can never drift.
- **Syntax highlighting.** Shiki runs at build time on the HAST tree, with a
  generous language set and dual light/dark themes.
- **Nav derives itself.** The sidebar is built from each page's frontmatter,
  never hand-written.
- **The whole chrome.** Header, collapsible sidebar, mobile nav, in-page table
  of contents, breadcrumbs, and prev/next links, all included.
- **Yours to theme.** One CSS import ships the Tailwind and shadcn token system;
  override any token to make it your own.

## Where to next

<CardGrid>
	<Card title="Installation" href="/docs/installation">
		{#snippet icon()}<Rocket class="size-5" />{/snippet}
		Add DocSmith to a SvelteKit project and wire up the one-line CSS contract.
	</Card>
	<Card title="Quick Start" href="/docs/quick-start">
		{#snippet icon()}<BookOpen class="size-5" />{/snippet}
		Register the pipeline and render your first page in four steps.
	</Card>
</CardGrid>
