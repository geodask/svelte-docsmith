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

Svelte DocSmith is the documentation framework for Svelte 5 library
authors. Your interactive examples live inside one real, stateful SvelteKit
app — not sandboxed as isolated islands, and not screenshots of a component
that used to work.

You write markdown under `src/routes/docs/`. DocSmith turns it into styled,
navigable, syntax-highlighted pages, and lets you drop the same components
your users import straight into the prose.

## Why another docs tool?

A library's docs are only as good as their examples. Screenshots go stale.
Sandboxed islands drift from the package your users install. When the
example is the real component, running in the same app as the docs, that
rot is gone by construction.

That is why a DocSmith page is a real SvelteKit route: so the button, form,
or chart in your docs is the same component your users import — running,
stateful, and impossible to let rot. Live examples are the reason to adopt
DocSmith.

The scaffolding holds its own. Drop a page under `src/routes/docs/` and the
sidebar builds itself from frontmatter — never a hand-maintained nav tree.
The shell brings the header, mobile nav, in-page TOC, and prev/next links;
the pipeline handles highlighting and anchors. You write content; the
chrome and navigation keep up.

## Highlights

- **Live examples.** Drop a component into a page; it runs, and its source is
  shown from the same file, so the two can never drift.
- **Markdown as routes.** `.md` files compile to real Svelte components via
  mdsvex. No loader, no catch-all route.
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
