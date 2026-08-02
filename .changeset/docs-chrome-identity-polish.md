---
'svelte-docsmith': patch
---

Polish the docs chrome and landing sections for reading measure, identity, and recovery:

- Ship Source Serif 4 with `theme.css` and apply it on landing display headings (`Hero`, `FeatureGrid`, `CTA`); land body copy on foreground ink
- Cap markdown articles at `max-w-prose` so body measure stays ~65ch on wide screens
- Make breadcrumbs navigable: group steps link to the group's first page
- After a "No" on page feedback, offer Edit this page and Open an issue when configured
- Label the mobile table-of-contents control ("On this page") instead of an icon-only button
- Add an optional `before` snippet on `CTA` so notes can sit above the heading while the section still ends on the actions
