// Build-time Shiki-highlighted source for the example components, produced by the
// `docsmith()` Vite plugin's `?source` transform. Re-exported here so the rest of
// the app imports plain `string`s.
//
// The `@ts-expect-error`s are required and stable: svelte-check's `.svelte`
// resolver claims a `.svelte?source` specifier before the `*?source` ambient
// (app.d.ts) can apply, so TypeScript always reports "cannot find module". The
// module resolves at build time — verified in dev and production build.

// @ts-expect-error - `?source` virtual module resolved by the docsmith() Vite plugin at build time.
export { default as heroSource } from './hero-demo.svelte?source';
// @ts-expect-error - `?source` virtual module resolved by the docsmith() Vite plugin at build time.
export { default as counterSource } from './counter.svelte?source';
