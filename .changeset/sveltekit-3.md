---
'svelte-docsmith': minor
'create-svelte-docsmith': minor
---

Support SvelteKit 3. `svelte-docsmith` now accepts `@sveltejs/kit` `^2.16.0 || ^3.0.0` as its peer, so existing SvelteKit 2 sites keep working unchanged. New projects from `create-svelte-docsmith` start on SvelteKit 3: configuration lives in `vite.config.ts` (`sveltekit({ extensions, preprocess, adapter })`) and your own files are imported from `#lib`. The archive notice now also lists `#lib` imports.
