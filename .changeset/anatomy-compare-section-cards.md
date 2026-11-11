---
'svelte-docsmith': minor
---

Three new docs components. `Anatomy` labels the parts of a live component: mark each part with `data-part="name"` and describe it with a `<Part name="name">` in the `parts` snippet. The numbered labels sit over the real component, follow it as it changes size or state, let clicks through, and can be hidden. A `data-part` with no `Part`, or a `Part` with no `data-part`, warns in development. `Compare` shows two versions of one thing split by a divider the reader drags or moves with the arrow keys; each side is a picture (an imported file or a URL) or a snippet of live content, labelled "Before" and "After" unless you name them. `SectionCards` lists the pages of a section as cards in sidebar order, the page's own section by default or another with `section`, and agent markdown writes the list out as links.
