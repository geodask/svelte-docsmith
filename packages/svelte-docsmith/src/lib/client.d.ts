// Ambient types for the imports the `docsmith()` Vite plugin serves. Reference
// them once, from `src/app.d.ts`:
//
//   /// <reference types="svelte-docsmith/client" />
//
// The patterns match on the query, so svelte-check doesn't treat the specifier
// as a `.svelte` component import.

/** `import source from './counter.svelte?source'`: highlighted HTML for `LiveExample`. */
declare module '*.svelte?source' {
	const html: string;
	export default html;
}

/**
 * `import props from './button.svelte?props'`: the component's props, extracted
 * at build time, for `<PropsTable of={props} />`.
 *
 * @experimental Outside the 1.0 stability promise.
 */
declare module '*.svelte?props' {
	const props: import('./index.js').ExtractedProps;
	export default props;
}
