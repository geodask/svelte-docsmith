---
'svelte-docsmith': minor
---

Generate props tables from your components' types (experimental). Import a component with `?props` and pass it to `<PropsTable of={…}>`: the `docsmith()` Vite plugin reads its typed `$props()` with the TypeScript checker, so types show resolved, descriptions come from JSDoc and defaults from the destructuring. Snippets, callbacks and `$bindable()` props get rows, `@deprecated` and `@internal` are honoured, and inherited HTML attributes collapse to one line. Needs the new optional peers `typescript` and `svelte2tsx`; anything unreadable becomes a build warning, never a failed build.

Also: `Prop` gains `bindable` and `deprecated` marks and splits only top-level unions into chips, and the new `svelte-docsmith/client` entry types `?source` and `?props` imports (`/// <reference types="svelte-docsmith/client" />` in `src/app.d.ts`).
