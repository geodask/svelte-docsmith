/**
 * The formats the theme builder (on the docs site) and `svelte-docsmith theme`
 * share, kept in one place so the two can't drift (ADR-0012).
 *
 * - A **theme link** is `#theme=` + base64url of deflate-raw of
 *   `{ "v": 1, "tokens": { light, dark }, "inputs"?: {…} }`. The format is
 *   public: agents build these links themselves, so it stays stable.
 * - A **paste code** is `dsm1.` + base64url of deflate-raw of a theme file.
 * - A **theme file** is `:root` with every token and `.dark` with only the
 *   tokens that differ from it.
 *
 * This module owns the JSON and the CSS. Each side does the base64url and
 * deflate-raw itself (CompressionStream in the browser, zlib in the CLI), and a
 * fixture test on each side checks that step against the same link.
 */

export type ThemeLinkTokens = {
	light: Record<string, string>;
	dark: Record<string, string>;
};

/** What a theme link carries, once decompressed and checked. */
export type ThemeLinkData = {
	tokens: ThemeLinkTokens;
	/** The builder's control positions, when the link came from the builder. */
	inputs?: Record<string, unknown>;
};

export const THEME_LINK_VERSION = 1;
export const PASTE_CODE_PREFIX = 'dsm1.';

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
export function writeThemeLinkJson(
	tokens: ThemeLinkTokens,
	inputs?: Record<string, unknown>
): string {
	return JSON.stringify({ v: THEME_LINK_VERSION, tokens, inputs });
}

/** Check a decompressed theme link. Throws a {@link ThemeLinkError}. */
export function readThemeLinkJson(json: string): ThemeLinkData {
	let data: { v?: unknown; tokens?: Partial<ThemeLinkTokens>; inputs?: Record<string, unknown> };
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

/** The theme file: `:root` in full, `.dark` with only what differs from it. */
export function toThemeFile(tokens: ThemeLinkTokens): string {
	const lines = (t: Record<string, string>) =>
		Object.entries(t)
			.map(([k, v]) => `\t--${k}: ${v};`)
			.join('\n');
	const darkOnly = Object.fromEntries(
		Object.entries(tokens.dark).filter(([k, v]) => tokens.light[k] !== v)
	);
	return (
		'/* Made with the svelte-docsmith theme builder: https://docsmith.geodask.com/themes */\n' +
		`:root {\n${lines(tokens.light)}\n}\n\n.dark {\n${lines(darkOnly)}\n}\n`
	);
}
