/**
 * The formats the theme builder (on the docs site) and `svelte-docsmith theme`
 * share, kept in one place so the two can't drift (ADR-0012).
 *
 * - A **theme link** is `#theme=` + base64url of deflate-raw of
 *   `{ "v": 1, "tokens": { light, dark }, "inputs"?: {…} }`. The format is
 *   public: agents build these links themselves, so it stays stable.
 * - A **paste code** is `dsm1.` + base64url of deflate-raw of a theme file.
 * - The **CLI handoff** is the builder's form POST of a theme file to the
 *   loopback port `svelte-docsmith theme` listens on: {@link CLI_HANDOFF}.
 *
 * The theme file itself is core/theme-file.ts's. This module owns the JSON and
 * the wire names. Each side does the base64url and
 * deflate-raw itself (CompressionStream in the browser, zlib in the CLI), and a
 * fixture test on each side checks that step against the same link.
 */

import type { ThemeTokens } from './theme-file.js';

/** What a theme link carries, once decompressed and checked. */
export type ThemeLinkData = {
	tokens: ThemeTokens;
	/** The builder's control positions, when the link came from the builder. */
	inputs?: Record<string, unknown>;
};

export const THEME_LINK_VERSION = 1;
export const PASTE_CODE_PREFIX = 'dsm1.';

/**
 * The names the CLI handoff travels under. The command opens the builder with
 * `?cli=<port>&state=<nonce>`; the builder posts a form to
 * `http://127.0.0.1:<port>/theme` with the nonce, the theme file and the page
 * to link back to.
 */
export const CLI_HANDOFF = {
	/** URL parameter on the builder: the loopback port to post to. */
	portParam: 'cli',
	/** URL parameter on the builder: the one-time nonce. */
	nonceParam: 'state',
	/** Path of the form POST on the loopback server. */
	path: '/theme',
	/** Form field: the nonce, sent back. */
	nonceField: 'state',
	/** Form field: the theme file. */
	fileField: 'file',
	/** Form field: the builder's own URL, for the "saved" page's link back. */
	backField: 'back'
} as const;

/** Why a theme link can't be read. Each side words the message for its reader. */
export class ThemeLinkError extends Error {
	constructor(
		readonly reason: 'damaged' | 'version' | 'no-tokens',
		/** The link's version, for `reason: 'version'`. */
		readonly version?: unknown
	) {
		super(`theme link: ${reason}${reason === 'version' ? ` (version ${version})` : ''}`);
		this.name = 'ThemeLinkError';
	}
}

/** The `#theme=` payload of a whole link, or the text itself if it is one already. */
export function themeLinkPayload(link: string): string {
	const at = link.indexOf('theme=');
	return (at === -1 ? link : link.slice(at + 'theme='.length)).trim();
}

/** The JSON a theme link compresses. */
export function writeThemeLinkJson(tokens: ThemeTokens, inputs?: Record<string, unknown>): string {
	return JSON.stringify({ v: THEME_LINK_VERSION, tokens, inputs });
}

/** Check a decompressed theme link. Throws a {@link ThemeLinkError}. */
export function readThemeLinkJson(json: string): ThemeLinkData {
	let data: { v?: unknown; tokens?: Partial<ThemeTokens>; inputs?: Record<string, unknown> };
	try {
		data = JSON.parse(json);
	} catch {
		throw new ThemeLinkError('damaged');
	}
	if (!data || typeof data !== 'object') throw new ThemeLinkError('damaged');
	if (data.v !== THEME_LINK_VERSION) throw new ThemeLinkError('version', data.v);
	const { light, dark } = data.tokens ?? {};
	if (!light || !dark) throw new ThemeLinkError('no-tokens');
	return { tokens: { light, dark }, inputs: data.inputs };
}
