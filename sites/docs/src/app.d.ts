// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Snippet } from 'svelte';

// for information about these interfaces
declare global {
	type WithChildren<T> = T & {
		children: Snippet;
	};

	type WithChildrenOptional<T> = T & {
		children?: Snippet;
	};

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
