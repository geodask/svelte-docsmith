---
'svelte-docsmith': minor
---

Render each doc page's `<h1>` and lead subtitle from frontmatter. The markdown layout now emits the page heading from `title` and a lead paragraph from `description`, so the visible page title, the sidebar label, and the `<title>` tag all come from one source — pages start their body at `##` and never repeat the title.

Note: if a page previously wrote its own top-level `# Heading`, remove it to avoid two `h1`s (the frontmatter title now provides the page heading).
