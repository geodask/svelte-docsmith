# {{PROJECT_NAME}}

A documentation site built with [Svelte DocSmith](https://docsmith.geodask.com).

## Develop

```bash
npm install
npm run dev
```

## Write docs

Add a `+page.md` file under `src/routes/docs/`. Its frontmatter drives the
sidebar:

```md
---
title: My Page
section: Guides
order: 1
---

## Hello

Your content here.
```

Save it and the page appears in the sidebar, styled and highlighted.

## Configure

- **Site title, nav, footer, SEO** — `src/lib/site-config.ts`
- **Theme** — `src/app.css` (import a preset, or override tokens)

## Build

```bash
npm run build
npm run preview
```
