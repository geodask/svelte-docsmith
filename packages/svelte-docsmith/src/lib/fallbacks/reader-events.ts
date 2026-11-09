/**
 * `svelte-docsmith/reader-events` — the author's reader event handler.
 *
 * At build time the `docsmith()` Vite plugin (in `vite.config.ts`) intercepts
 * this import and replaces it with the default export of the module
 * `readerEvents` names, or `undefined` when there is none. This file is only
 * the fallback that runs when the plugin is missing.
 *
 * Unlike most fallbacks it doesn't throw: reader events are optional, and the
 * components that report them work without the plugin, so with no plugin there
 * is simply no handler.
 */
import type { ReaderEventHandler } from '#lib/core/reader-events.js';

export const handler: ReaderEventHandler | undefined = undefined;
