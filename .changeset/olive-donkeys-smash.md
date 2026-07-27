---
'svelte-docsmith': patch
---

- Scope the code block styles to the component's own `<pre>`, so they no longer restyle unrelated code blocks in the consuming app
- Fix the layout shift when hovering a link, caused by those styles arriving with a preloaded route and repainting code blocks the component never rendered
