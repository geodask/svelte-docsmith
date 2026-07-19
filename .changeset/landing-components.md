---
'svelte-docsmith': minor
---

Add landing page sections, so the marketing page in front of your docs is built from the same design tokens as the docs themselves rather than hand-rolled.

Five new components: `Hero` (headline, description, call-to-action buttons, and an optional second column for a code sample or screenshot; without one it centres on a single column), `FeatureGrid` and `Feature` (a two or three column grid of icon-and-text cells, with an optional tinted band for alternating against neighbouring sections), `CTA` (the closing panel, with a soft glow behind the heading), and `Action` (the call-to-action link used by `Hero` and `CTA`, in filled and outlined variants).

Each renders its own full-width `<section>` with the container and spacing already set, so a landing page is a handful of components rather than a wall of layout classes. They use only design tokens, so they follow every theme preset and both colour schemes without configuration.
