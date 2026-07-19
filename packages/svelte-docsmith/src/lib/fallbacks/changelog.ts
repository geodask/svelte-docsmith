/**
 * `svelte-docsmith/changelog` — the generated release index.
 *
 * At build time the `docsmith()` Vite plugin (in `vite.config.ts`) intercepts
 * this import and replaces it with your package's `CHANGELOG.md`, parsed into
 * releases and dated from git. This file is only the fallback that runs when
 * the plugin is missing — see {@link missingPluginError}.
 */
import type { ChangelogRelease } from '$lib/core/changelog.js';
import { missingPluginError } from './missing-plugin.js';

export const releases: ChangelogRelease[] = [];

throw missingPluginError('changelog');
