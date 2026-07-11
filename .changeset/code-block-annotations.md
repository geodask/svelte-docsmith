---
'svelte-docsmith': minor
---

Add code-block annotations. On top of Shiki line highlighting, doc code fences now support the full set of comment-driven markers, each styled for light and dark:

- **Diff** — `// [!code ++]` / `// [!code --]`, with colored backgrounds and `+`/`-` gutter markers (this finishes a feature that was styled but not wired).
- **Focus** — `// [!code focus]` dims the other lines and sharpens them on hover.
- **Error / warning** — `// [!code error]` / `// [!code warning]` tint a line red or amber.
- **Word highlight** — `// [!code word:name]` highlights a token.

Markers are stripped from the rendered output. No new dependencies (the transformers ship with the `@shikijs/transformers` DocSmith already used). See the new **Code blocks** page in the docs.
