---
'svelte-docsmith': patch
---

Declare all runtime dependencies. `@lucide/svelte`, `clsx`, `tailwind-merge`, `tailwind-variants`, `tw-animate-css`, and `@fontsource-variable/inter` were devDependencies, so installs outside this monorepo failed to resolve imports from the shipped components and `theme.css`. They are now regular dependencies.
