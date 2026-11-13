/**
 * The colours an OG image is drawn in, read from the site's theme. satori only
 * understands hex, `rgb()` and `hsl()`, and themes are written in `oklch()`, so
 * the conversion happens here, once, when the plugin reads the theme file.
 */
import { oklchToHex, oklchToSrgb } from '../../core/colour.js';
import type { ThemeTokens } from '../../core/theme-file.js';

/** The five theme colours an OG image uses, each as a colour satori can read. */
export type OgColours = {
	/** The card's background: the theme's `--background`. */
	background: string;
	/** The page title and site title: `--foreground`. */
	foreground: string;
	/** The description and host: `--muted-foreground`. */
	muted: string;
	/** The accent bar, mark and section: `--primary`. */
	primary: string;
	/** The rule above the footer: `--border`. */
	border: string;
};

/** Darkmatter's dark colour mode, for a theme that leaves a colour out. */
export const DEFAULT_OG_COLOURS: OgColours = {
	background: '#121113',
	foreground: '#c1c1c1',
	muted: '#888888',
	primary: '#e78a53',
	border: '#222222'
};

/**
 * The OG image colours from a theme's tokens. The dark colour mode is used,
 * where most themes look their most distinctive, falling back to the light
 * one for a token the dark block leaves out, then to {@link DEFAULT_OG_COLOURS}.
 */
export function ogColours(tokens: ThemeTokens): OgColours {
	const pick = (name: string, fallback: string) =>
		toSatoriColour(tokens.dark[name] ?? '') ?? toSatoriColour(tokens.light[name] ?? '') ?? fallback;
	return {
		background: pick('background', DEFAULT_OG_COLOURS.background),
		foreground: pick('foreground', DEFAULT_OG_COLOURS.foreground),
		muted: pick('muted-foreground', DEFAULT_OG_COLOURS.muted),
		primary: pick('primary', DEFAULT_OG_COLOURS.primary),
		border: pick('border', DEFAULT_OG_COLOURS.border)
	};
}

/**
 * A CSS colour as one satori can draw, or `undefined` when it can't be read.
 * `oklch()` is converted to hex (or `rgba()` when it has alpha); hex, `rgb()`
 * and `hsl()` pass through; bare HSL channels (`222 47% 11%`, the shape older
 * shadcn themes use) are wrapped in `hsl()`. Anything else, such as a `var()`,
 * is unreadable here.
 */
export function toSatoriColour(value: string): string | undefined {
	const v = value.trim();
	if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return v;
	if (/^(?:rgba?|hsla?)\([^()]*\)$/i.test(v)) return v;
	if (/^-?[\d.]+(?:deg)?\s+[\d.]+%\s+[\d.]+%$/.test(v)) return `hsl(${v})`;
	const oklch = /^oklch\(\s*([^)]*)\)$/i.exec(v);
	if (oklch) return fromOklch(oklch[1]);
	return undefined;
}

function fromOklch(args: string): string | undefined {
	const [channels, alphaPart] = args.split('/');
	const parts = channels.trim().split(/\s+/);
	if (parts.length !== 3) return undefined;
	const l = number(parts[0], 1);
	const c = number(parts[1], 0.4);
	const h = parts[2] === 'none' ? 0 : number(parts[2].replace(/deg$/, ''), 1);
	const alpha = alphaPart === undefined ? 1 : number(alphaPart.trim(), 1);
	if ([l, c, h, alpha].some((n) => n === undefined || Number.isNaN(n))) return undefined;
	if (alpha! >= 1) return oklchToHex([l!, c!, h!]);
	const [r, g, b] = oklchToSrgb([l!, c!, h!]);
	return `rgba(${r}, ${g}, ${b}, ${round(Math.max(0, alpha!), 3)})`;
}

/** A channel as a number, with a percentage taken against `percentOf`. */
function number(text: string, percentOf: number): number | undefined {
	if (text === 'none') return 0;
	const percent = text.endsWith('%');
	const n = Number(percent ? text.slice(0, -1) : text);
	if (text === '' || Number.isNaN(n)) return undefined;
	return percent ? (n / 100) * percentOf : n;
}

function round(n: number, digits: number): number {
	const f = 10 ** digits;
	return Math.round(n * f) / f;
}
