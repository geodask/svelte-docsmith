// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// `import source from './x.svelte?source'` — build-time highlighted HTML string
// produced by the example-source Vite plugin. Matches on the `?source` query so
// svelte-check doesn't treat the specifier as a `.svelte` component import.
declare module '*.svelte?source' {
	const html: string;
	export default html;
}

export {};
