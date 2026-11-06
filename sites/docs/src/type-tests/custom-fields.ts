// Type test, checked by `svelte-check` and never imported: proves that the
// augmentation the Writing pages docs show types `data` through the published
// package. If `DocsCustomFields` stops merging (say, a re-export that hides the
// declaration), `draft` falls back to `unknown` and both lines below fail.
import type { DocsContentItem } from 'svelte-docsmith';

declare module 'svelte-docsmith' {
	interface DocsCustomFields {
		typeTestFlag?: boolean;
	}
}

declare const entry: DocsContentItem;

export const declared: boolean | undefined = entry.data?.typeTestFlag;

// @ts-expect-error a declared custom field keeps its declared type
export const mistyped: string | undefined = entry.data?.typeTestFlag;

// Undeclared custom fields stay readable, as `unknown`.
export const undeclared: unknown = entry.data?.anythingElse;
