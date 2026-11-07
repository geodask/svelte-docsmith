---
'svelte-docsmith': patch
---

- Fixing a broken `tsconfig.json` now brings props tables' types back in `vite dev`. Before, a props table read while TypeScript couldn't be set up kept showing names only until its component file changed or the server restarted.
- `archive-version` now escapes quotes in the `versions` block it prints, so a label like `Bob's 1.x` pastes as valid code.
- The frontmatter typo warning no longer reads a built-in key with one letter in front as a typo (`border` is not `order`), and it skips any custom key your `schema` declares.
