/**
 * Draw an OG image: the card's element tree to SVG with satori, then to PNG
 * with resvg. Both are optional peer dependencies, loaded on the first image,
 * so a site that serves no OG images never needs them installed.
 */
import { OG_HEIGHT, OG_WIDTH, type OgNode } from './card.js';

type Satori = (
	element: OgNode,
	options: {
		width: number;
		height: number;
		fonts: { name: string; data: Uint8Array; weight: number; style: 'normal' }[];
	}
) => Promise<string>;
type ResvgClass = new (
	svg: string,
	options?: { fitTo?: { mode: 'width'; value: number } }
) => { render(): { asPng(): Uint8Array } };

type Renderer = { satori: Satori; Resvg: ResvgClass; fonts: Parameters<Satori>[1]['fonts'] };

// Named through variables so Vite leaves the imports alone at build time:
// a literal `import('satori')` fails the build of every site that hasn't
// installed it, even one that never serves an OG image.
const SATORI = 'satori';
const RESVG = '@resvg/resvg-js';

let renderer: Promise<Renderer> | undefined;

/** The error a site sees when it serves OG images without the renderer. */
export const MISSING_RENDERER =
	'[svelte-docsmith] ogImages() draws images with satori and @resvg/resvg-js, which are not installed. ' +
	'Add them to the docs app: npm i -D satori @resvg/resvg-js';

async function load(): Promise<Renderer> {
	let satoriModule: { default: Satori };
	let resvgModule: { Resvg?: ResvgClass; default?: { Resvg: ResvgClass } };
	try {
		[satoriModule, resvgModule] = await Promise.all([
			import(/* @vite-ignore */ SATORI),
			import(/* @vite-ignore */ RESVG)
		]);
	} catch (cause) {
		throw new Error(MISSING_RENDERER, { cause });
	}
	const { interFonts } = await import('./fonts.js');
	return {
		satori: satoriModule.default,
		Resvg: (resvgModule.Resvg ?? resvgModule.default?.Resvg) as ResvgClass,
		fonts: interFonts.map(({ name, weight, data }) => ({
			name,
			data: Uint8Array.from(atob(data), (c) => c.charCodeAt(0)),
			weight,
			style: 'normal' as const
		}))
	};
}

/** Draw one card as PNG bytes. */
export async function renderOgImage(card: OgNode): Promise<Uint8Array> {
	renderer ??= load();
	// A failed load is not cached, so installing the renderer and retrying in
	// `vite dev` works without a restart.
	const { satori, Resvg, fonts } = await renderer.catch((error) => {
		renderer = undefined;
		throw error;
	});
	const svg = await satori(card, { width: OG_WIDTH, height: OG_HEIGHT, fonts });
	return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
}
