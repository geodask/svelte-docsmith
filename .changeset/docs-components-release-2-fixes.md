---
'svelte-docsmith': patch
---

Fixes for Columns, Do and Dont, and colour swatches. A `ColorSwatch` whose variable has a fallback with brackets, like `var(--brand, oklch(0.5 0.1 200))`, is named by the variable again. Its value is read again when the `value` prop changes, a token derived with `color-mix()` shows the colour it comes out as, and a site that marks dark mode with an attribute such as `data-theme` on `html`, or that follows the system setting, updates the swatches too. Columns stack below Tailwind's `sm` breakpoint, so a site that changes it moves Columns with it. The Do and Dont colours keep their `--docsmith-do` and `--docsmith-dont` names, but their defaults now live in the component rather than in `theme.css`.
