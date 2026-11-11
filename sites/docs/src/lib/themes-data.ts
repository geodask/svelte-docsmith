/**
 * The shipped presets, as the theme showcase and the theme builder use them:
 * the preset manifest says which there are, in what order and under what
 * name, and each preset's tokens are read from its own CSS file by the
 * package's theme file reader, so the site shows exactly what
 * `docsmith({ theme })` would serve.
 *
 * Both are imported by path: the manifest is the copy the scaffolder ships,
 * and `$docsmith` is a Vite alias that TypeScript can't see.
 */
import manifest from '../../../../packages/create-svelte-docsmith/presets.json';
import {
	DEFAULT_PRESET,
	themeTokens,
	type Tokens
} from '../../../../packages/svelte-docsmith/src/lib/core/theme-file.ts';

/** Each preset's CSS, as text: `?raw` keeps it out of the page's own styles. */
const sources = import.meta.glob<string>(
	'../../../../packages/svelte-docsmith/src/lib/themes/*.css',
	{ query: '?raw', import: 'default', eager: true }
);

function source(slug: string): string {
	const file = Object.keys(sources).find((path) => path.endsWith(`/${slug}.css`));
	if (!file) throw new Error(`The preset manifest lists "${slug}", which has no CSS file.`);
	return sources[file];
}

export type Theme = { name: string; slug: string; light: Tokens; dark: Tokens };

/** Every preset, in the manifest's display order, with its full token set. */
export const themes: Theme[] = manifest.map(({ slug, name }) => ({
	name,
	slug,
	...themeTokens(source(slug))
}));

export const defaultThemeSlug = DEFAULT_PRESET;
