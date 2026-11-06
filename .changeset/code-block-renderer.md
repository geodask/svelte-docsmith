---
'svelte-docsmith': patch
---

Fix a build error when a code fence's `title` contains a double quote, and a fence title with `{braces}` no longer turns into a Svelte expression: `title='say "hi" to {name}.ts'` now shows exactly that. Markdown fences and `?source` imports now go through one code block renderer, so a LiveExample's source panel also honours the `[!code …]` notation comments a fence does.
