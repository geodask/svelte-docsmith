---
'svelte-docsmith': minor
---

Add nested sidebar sections. A page's `section` frontmatter now accepts an array as well as a string: `section: [Guides, Advanced]` nests the page inside a collapsible **Advanced** subsection under **Guides**. Nesting can go any number of levels deep; `order` still sorts each level, and a subsection takes the smallest `order` of its pages so it slots into reading order. In the sidebar, nested groups are collapsible (a caret on the right of the row), with the branch containing the current page expanded on load and the rest collapsed. Breadcrumbs and the prev/next pager follow the full nested path. Single-string `section` values are unchanged.

Also makes sidebar ordering deterministic: pages that share an `order` (for example all defaulting to `0`) now tie-break by title instead of by filesystem scan order, so the sidebar is stable across machines.
