---
title: Installation
description: Add Svelte DocSmith to a SvelteKit project.
section: Getting Started
order: 2
---

## Install the package

Install `svelte-docsmith` with your package manager of choice:

```bash
pnpm add -D svelte-docsmith
```

## Configuration

DocSmith reads a small typed config object. A minimal `docsmith.config.json`
looks like this:

```json
{
	"title": "My Library Docs",
	"github": "https://github.com/you/your-lib",
	"theme": "github"
}
```

That JSON block is highlighted even though `json` was never in the old
hardcoded language list — proof the Shiki rehype swap ships the full language
set.
