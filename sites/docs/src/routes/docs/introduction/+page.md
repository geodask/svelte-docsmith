---
title: Introduction
description: What Svelte DocSmith is and who it is for.
section: Getting Started
order: 1
---

## What is Svelte DocSmith?

Svelte DocSmith is a framework for building documentation sites with Svelte 5
and SvelteKit. Your interactive examples live inside one real, stateful app —
not sandboxed as isolated islands, not screenshots of a component that used to
work.

You write markdown; DocSmith gives you the pipeline that turns it into styled,
navigable, syntax-highlighted pages — and lets you drop live Svelte components
straight into the prose.

## Why another docs tool?

Most Svelte docs are written by hand or bolted onto a general-purpose static
site generator. Either way you end up maintaining a navigation tree, wiring up a
markdown pipeline, and rebuilding the same layout every project. DocSmith gives
you the pipeline, the layout, and the navigation out of the box, so you can
focus on the content.

And because a page is a real SvelteKit route, an example in your docs is the
same component your users import — running, stateful, and impossible to let rot.

### Highlights

- **Markdown as routes.** `.md` files compile to real Svelte components via
  mdsvex — no loader, no catch-all route.
- **Live examples.** Drop a component into a page; it runs, and its source is
  shown from the same file, so the two can never drift.
- **Syntax highlighting.** Shiki runs at build time on the HAST tree, with a
  generous language set and dual light/dark themes.
- **Nav derives itself.** The sidebar is built from each page's frontmatter —
  never hand-written.
- **The whole chrome.** Header, collapsible sidebar, mobile nav, in-page table
  of contents, breadcrumbs, and prev/next links, all included.
- **Yours to theme.** One CSS import ships the Tailwind + shadcn token system;
  override any token to make it your own.

## Where to next

Head to [Installation](/docs/installation) to add DocSmith to a SvelteKit
project, then [Quick Start](/docs/quick-start) to wire up the pipeline and
render your first page.
