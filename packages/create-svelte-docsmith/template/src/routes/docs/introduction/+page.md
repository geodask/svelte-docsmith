---
title: Introduction
description: Welcome to your new documentation site.
section: Getting Started
order: 1
---

<script>
	import { Callout } from 'svelte-docsmith';
</script>

Welcome to your new documentation site, built with Svelte DocSmith.

## How it works

Every `+page.md` file under `src/routes/docs/` becomes a page, and its
frontmatter drives the sidebar:

- `title` names the page and its sidebar entry.
- `section` groups pages in the sidebar.
- `order` sorts pages within a group.

<Callout variant="tip" title="Try it">

Open `src/routes/docs/introduction/+page.md`, edit this text, and save. The page
updates instantly.

</Callout>

## Next

Head to the [Quick Start](/docs/quick-start) for the authoring basics.
