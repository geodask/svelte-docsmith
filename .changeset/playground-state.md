---
'svelte-docsmith': patch
---

Move the props playground's state into one module, separate from `LiveExample` and its controls. No API change; `controls` and `args` work as before. These behavior changes come with it:

- The usage line lists props in the order the component declares them, instead of the order they were first set.
- A number control treats `Infinity` (say, `1e999` typed in) as unset, like any other value that isn't a finite number.
- Swapping the props import passed to `controls` now starts a fresh playground for it, instead of keeping the previous component's values.
