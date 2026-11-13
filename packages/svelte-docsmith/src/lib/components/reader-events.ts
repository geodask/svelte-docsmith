/**
 * Where components report reader events. A call site says what happened;
 * reporting adds where the reader is, so every event of a page carries the
 * same `path`: the current path with its trailing slash stripped, the one the
 * page's content entry has, whatever the site's `trailingSlash` setting.
 *
 * Each call reaches the author's reader event handler (served by the
 * `docsmith()` plugin as `svelte-docsmith/reader-events`) in the browser only.
 * A handler that throws is logged and otherwise ignored: a broken handler must
 * never break the page.
 */
import { BROWSER } from 'esm-env';
import { page } from '$app/state';
import { handler } from 'svelte-docsmith/reader-events';
import type { ReaderEvent } from '#lib/core/reader-events.js';
import { normalizePath } from '#lib/utils/url.js';

/** A reader event as a call site reports it: everything but its `path`. */
export type Happening = ReaderEvent extends infer Event
	? Event extends ReaderEvent
		? Omit<Event, 'path'>
		: never
	: never;

export function report(happening: Happening): void {
	if (!BROWSER || typeof handler !== 'function') return;
	const event = { ...happening, path: normalizePath(page.url.pathname) } as ReaderEvent;
	try {
		handler(event);
	} catch (error) {
		console.error('[svelte-docsmith] the reader event handler threw on', event.type, error);
	}
}
