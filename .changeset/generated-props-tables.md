---
'svelte-docsmith': minor
---

Generate props tables from component types (experimental): `import props from './button.svelte?props'` then `<PropsTable of={props} />`. Needs the optional peers `typescript` and `svelte2tsx`. `Prop` gains `bindable` and `deprecated` marks, and the new `svelte-docsmith/client` entry types `?source` and `?props` imports.
