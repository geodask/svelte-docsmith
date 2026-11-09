/**
 * Where components report reader events. Each call reaches the author's reader
 * event handler (served by the `docsmith()` plugin as
 * `svelte-docsmith/reader-events`) in the browser only. A handler that throws
 * is logged and otherwise ignored: a broken handler must never break the page.
 */
import { BROWSER } from 'esm-env';
import { handler } from 'svelte-docsmith/reader-events';
import type { ReaderEvent } from '#lib/core/reader-events.js';

export function report(event: ReaderEvent): void {
	if (!BROWSER || typeof handler !== 'function') return;
	try {
		handler(event);
	} catch (error) {
		console.error('[svelte-docsmith] the reader event handler threw on', event.type, error);
	}
}
