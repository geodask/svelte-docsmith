/**
 * The theme builder's logic, with no DOM: a few guided inputs generate every
 * token of a theme for both colour modes, per-token overrides sit on top (a
 * preset, a pasted theme file, a hand edit), and the result serialises to a
 * theme file, a theme link and a CLI paste code.
 *
 * The theme link format is public (ADR-0012): `#theme=` + base64url of
 * deflate-raw of `{ "v": 1, "tokens": { light, dark }, "inputs"?: {…} }`.
 * `svelte-docsmith theme --link` decodes the same format; a fixture test on
 * both sides keeps them in step.
 */

export type Tokens = Record<string, string>;
export type ThemeTokens = { light: Tokens; dark: Tokens };
export type Mode = 'light' | 'dark';
export type Shadow = 'none' | 'soft' | 'crisp' | 'offset';

export interface Inputs {
	/** The brand colour, as a hex string. */
	brand: string;
	/** How much of the brand hue the neutrals carry, 0 (pure grey) to 1. */
	tint: number;
	/** Corner radius in rem. */
	radius: number;
	shadow: Shadow;
	/** Text font family name, as the author will load it. */
	fontSans: string;
	/** Code font family name. */
	fontMono: string;
}

export interface BuilderState {
	inputs: Inputs;
	/** Token values that win over the generated ones, per colour mode. */
	overrides: ThemeTokens;
}

export const defaultInputs: Inputs = {
	brand: '#d97a2b',
	tint: 0.3,
	radius: 0.75,
	shadow: 'soft',
	fontSans: 'Inter',
	fontMono: 'JetBrains Mono'
};

export const fontOptions = {
	sans: ['Inter', 'Geist', 'IBM Plex Sans', 'Source Sans 3', 'Source Serif 4', 'system-ui'],
	mono: ['JetBrains Mono', 'Geist Mono', 'IBM Plex Mono', 'Fira Code', 'ui-monospace']
};

export const shadowOptions: [Shadow, string][] = [
	['none', 'None'],
	['soft', 'Soft'],
	['crisp', 'Crisp'],
	['offset', 'Offset']
];

/** The colour tokens every theme sets, in the order a theme file lists them. */
export const COLOUR_TOKENS = [
	'background',
	'foreground',
	'card',
	'card-foreground',
	'popover',
	'popover-foreground',
	'primary',
	'primary-foreground',
	'secondary',
	'secondary-foreground',
	'muted',
	'muted-foreground',
	'accent',
	'accent-foreground',
	'destructive',
	'destructive-foreground',
	'border',
	'input',
	'ring',
	'chart-1',
	'chart-2',
	'chart-3',
	'chart-4',
	'chart-5',
	'sidebar',
	'sidebar-foreground',
	'sidebar-primary',
	'sidebar-primary-foreground',
	'sidebar-accent',
	'sidebar-accent-foreground',
	'sidebar-border',
	'sidebar-ring'
];

export function emptyState(inputs: Inputs = defaultInputs): BuilderState {
	return { inputs: { ...inputs }, overrides: { light: {}, dark: {} } };
}

// ---------------------------------------------------------------- colour maths

/** OKLCH as [lightness 0–1, chroma, hue in degrees]. */
export type Oklch = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function srgbToOklch(r: number, g: number, b: number): Oklch {
	const [lr, lg, lb] = [r, g, b].map(toLinear);
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	const C = Math.hypot(A, B);
	return [L, C, C < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

function oklchToLinearSrgb([L, C, H]: Oklch): [number, number, number] {
	const a = C * Math.cos((H * Math.PI) / 180);
	const b = C * Math.sin((H * Math.PI) / 180);
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
	].map((c) => Math.min(1, Math.max(0, c))) as [number, number, number];
}

export function hexToOklch(hex: string): Oklch {
	const n = hex.replace('#', '');
	const full = n.length === 3 ? [...n].map((ch) => ch + ch).join('') : n;
	const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
	return srgbToOklch(r, g, b);
}

export function oklchToHex(c: Oklch): string {
	return (
		'#' +
		oklchToLinearSrgb(c)
			.map((v) =>
				Math.round(Math.min(1, Math.max(0, fromLinear(v))) * 255)
					.toString(16)
					.padStart(2, '0')
			)
			.join('')
	);
}

function hslToOklch(h: number, s: number, l: number): Oklch {
	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
	return srgbToOklch(f(0), f(8), f(4));
}

/**
 * Read a CSS colour a theme might use: `oklch()`, hex or `hsl()`. Anything
 * else (a `var()`, a named colour) is `null`, so callers skip it.
 */
export function parseColour(value: string | undefined): Oklch | null {
	if (!value) return null;
	const v = value.trim().toLowerCase();
	let m = v.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/);
	if (m) return [+m[1] / (m[2] ? 100 : 1), +m[3], +m[4]];
	m = v.match(/^#([\da-f]{3}|[\da-f]{6})$/);
	if (m) return hexToOklch(v);
	m = v.match(/^hsl\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/);
	if (m) return hslToOklch(+m[1], +m[2] / 100, +m[3] / 100);
	return null;
}

function luminance(c: Oklch) {
	const [r, g, b] = oklchToLinearSrgb(c);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two colours. */
export function contrast(a: Oklch, b: Oklch) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

export function formatOklch([L, C, H]: Oklch) {
	const n = (v: number, d: number) => String(Number(v.toFixed(d)));
	return `oklch(${n(L, 3)} ${n(C, 3)} ${n(H, 1)})`;
}

/** Walk lightness away from `bg` until the colour reaches `ratio` on it. */
function readable(c: Oklch, bg: Oklch, ratio = 4.5): Oklch {
	const step = luminance(bg) > 0.18 ? -0.005 : 0.005;
	let [L] = c;
	const [, C, H] = c;
	while (contrast([L, C, H], bg) < ratio) {
		const next = L + step;
		if (next < 0 || next > 1) break;
		L = next;
	}
	return [L, C, H];
}

// ------------------------------------------------------------------ generation

const SHADOWS: Record<Shadow, { o: number; blur: number; x: number; y: number }> = {
	none: { o: 0, blur: 0, x: 0, y: 1 },
	soft: { o: 0.08, blur: 6, x: 0, y: 2 },
	crisp: { o: 0.16, blur: 0, x: 0, y: 2 },
	offset: { o: 1, blur: 0, x: 3, y: 3 }
};

function shadowScale(kind: Shadow): Tokens {
	const s = SHADOWS[kind];
	const px = (v: number) => `${v}px`;
	const c = (a: number) => `hsl(0 0% 0% / ${Math.min(a, 1).toFixed(2)})`;
	const first = (a: number) => `${px(s.x)} ${px(s.y)} ${px(s.blur)} 0px ${c(a)}`;
	const second = (y: number, b: number) => `${px(s.x)} ${px(y)} ${px(b)} -1px ${c(s.o)}`;
	return {
		'shadow-2xs': first(s.o * 0.5),
		'shadow-xs': first(s.o * 0.5),
		'shadow-sm': `${first(s.o)}, ${second(1, 2)}`,
		shadow: `${first(s.o)}, ${second(1, 2)}`,
		'shadow-md': `${first(s.o)}, ${second(2, 4)}`,
		'shadow-lg': `${first(s.o)}, ${second(4, 6)}`,
		'shadow-xl': `${first(s.o)}, ${second(8, 10)}`,
		'shadow-2xl': first(s.o * 2.5)
	};
}

function fontStack(name: string, kind: 'sans' | 'mono') {
	if (/^(system-ui|ui-)/.test(name)) return name;
	const fallback =
		kind === 'mono'
			? 'monospace'
			: /serif/i.test(name) && !/sans/i.test(name)
				? 'serif'
				: 'sans-serif';
	return `'${name}', ${fallback}`;
}

function mode(inputs: Inputs, dark: boolean): Tokens {
	const [bL, bC, bH] = hexToOklch(inputs.brand);
	const nc = inputs.tint * 0.035;
	const n = (L: number): Oklch => [L, nc, bH];

	const bg = n(dark ? 0.165 : 0.995);
	const fg = n(dark ? 0.965 : 0.21);
	const muted = n(dark ? 0.25 : 0.965);
	const border = n(dark ? 0.28 : 0.92);

	// Primary: the brand, lifted in dark mode so it holds up on the surface.
	// It must reach 3:1 on the page (links are underlined, so the non-text
	// threshold applies), and its own text, white or near-black, 4.5:1. The
	// lightness moves only as far as that takes; white text wins a tie.
	const base: Oklch = [dark ? Math.max(bL, 0.72) : bL, bC, bH];
	const white: Oklch = [1, 0, 0];
	const ink = n(dark ? 0.17 : 0.2);
	const fits = (p: Oklch, on: Oklch) => contrast(p, bg) >= 3 && contrast(on, p) >= 4.5;
	const options = [white, ink].map((on) => {
		const p = readable(readable(base, bg, 3), on, 4.5);
		return { on, p, ok: fits(p, on), moved: Math.abs(p[0] - base[0]) };
	});
	const best =
		options.filter((o) => o.ok).sort((a, b) => a.moved - b.moved)[0] ??
		options.sort((a, b) => contrast(b.on, b.p) - contrast(a.on, a.p))[0];
	const primary = best.p;
	const onPrimary = best.on;

	// Muted text sits on the page and on muted surfaces: meet AA on the harder one.
	const mutedFg = readable(readable(n(dark ? 0.72 : 0.55), muted), bg);
	const chroma = Math.max(Math.min(bC, 0.16), 0.08);
	const chart = (dh: number): Oklch => [dark ? 0.7 : 0.62, chroma, (bH + dh) % 360];
	// Code sits on the muted surface (pre.svelte). A grey brand gets grey code.
	const codeChroma = bC < 0.03 && nc < 0.004 ? 0 : Math.min(Math.max(bC, 0.09), 0.16);
	const code = (dh: number) => readable([dark ? 0.8 : 0.5, codeChroma, (bH + dh) % 360], muted);

	const t: Tokens = {
		background: formatOklch(bg),
		foreground: formatOklch(fg),
		card: formatOklch(n(dark ? 0.2 : 1)),
		'card-foreground': formatOklch(fg),
		popover: formatOklch(n(dark ? 0.2 : 1)),
		'popover-foreground': formatOklch(fg),
		primary: formatOklch(primary),
		'primary-foreground': formatOklch(onPrimary),
		secondary: formatOklch(n(dark ? 0.27 : 0.95)),
		'secondary-foreground': formatOklch(fg),
		muted: formatOklch(muted),
		'muted-foreground': formatOklch(mutedFg),
		accent: formatOklch(n(dark ? 0.27 : 0.95)),
		'accent-foreground': formatOklch(fg),
		destructive: formatOklch(dark ? [0.7, 0.19, 22] : [0.58, 0.22, 27]),
		'destructive-foreground': formatOklch(dark ? [0.17, 0.02, 22] : [0.985, 0, 0]),
		border: formatOklch(border),
		input: formatOklch(border),
		ring: formatOklch(primary),
		'chart-1': formatOklch(chart(0)),
		'chart-2': formatOklch(chart(60)),
		'chart-3': formatOklch(chart(150)),
		'chart-4': formatOklch(chart(210)),
		'chart-5': formatOklch(chart(290)),
		sidebar: formatOklch(n(dark ? 0.19 : 0.975)),
		'sidebar-foreground': formatOklch(fg),
		'sidebar-primary': formatOklch(primary),
		'sidebar-primary-foreground': formatOklch(onPrimary),
		'sidebar-accent': formatOklch(n(dark ? 0.25 : 0.94)),
		'sidebar-accent-foreground': formatOklch(fg),
		'sidebar-border': formatOklch(border),
		'sidebar-ring': formatOklch(primary),
		'code-token-keyword': formatOklch(code(0)),
		'code-token-string': formatOklch(code(140)),
		'code-token-function': formatOklch(code(250)),
		'code-token-constant': formatOklch(code(80)),
		'code-token-parameter': formatOklch(code(310)),
		'code-token-comment': formatOklch(mutedFg),
		'code-token-string-expression': 'var(--code-token-string)',
		'code-token-punctuation': 'var(--code-token-comment)'
	};
	if (!dark) {
		t.radius = `${inputs.radius}rem`;
		t['font-sans'] = fontStack(inputs.fontSans, 'sans');
		t['font-mono'] = fontStack(inputs.fontMono, 'mono');
		Object.assign(t, shadowScale(inputs.shadow));
	}
	return t;
}

/** Every token of a theme, both colour modes, from the guided inputs. */
export function generate(inputs: Inputs): ThemeTokens {
	return { light: mode(inputs, false), dark: mode(inputs, true) };
}

/** The theme as shown: the generated tokens with the overrides on top. */
export function resolve(state: BuilderState): ThemeTokens {
	const g = generate(state.inputs);
	return {
		light: { ...g.light, ...state.overrides.light },
		dark: { ...g.dark, ...state.overrides.dark }
	};
}

/** The tokens `.dark` actually shows: it inherits what it doesn't set from `:root`. */
export function modeTokens(tokens: ThemeTokens, m: Mode): Tokens {
	return m === 'light' ? tokens.light : { ...tokens.light, ...tokens.dark };
}

/**
 * Change guided inputs. Every override whose generated value moves is
 * dropped, so a control always visibly does something, even over a preset or
 * a pasted theme. Overrides the change doesn't touch stay.
 */
export function setInputs(state: BuilderState, patch: Partial<Inputs>): BuilderState {
	const before = generate(state.inputs);
	const inputs = { ...state.inputs, ...patch };
	const after = generate(inputs);
	const keep = (o: Tokens, b: Tokens, a: Tokens) =>
		Object.fromEntries(Object.entries(o).filter(([k]) => b[k] === a[k]));
	return {
		inputs,
		overrides: {
			light: keep(state.overrides.light, before.light, after.light),
			dark: keep(state.overrides.dark, before.dark, after.dark)
		}
	};
}

/** Set one token by hand in one colour mode. */
export function setToken(state: BuilderState, m: Mode, key: string, value: string): BuilderState {
	return {
		...state,
		overrides: { ...state.overrides, [m]: { ...state.overrides[m], [key]: value.trim() } }
	};
}

/** Drop a hand edit, so the token follows the guided inputs again. */
export function clearToken(state: BuilderState, m: Mode, key: string): BuilderState {
	const rest = { ...state.overrides[m] };
	delete rest[key];
	return { ...state, overrides: { ...state.overrides, [m]: rest } };
}

function firstFamily(stack: string | undefined) {
	const first = stack
		?.split(',')[0]
		?.trim()
		.replace(/^['"]|['"]$/g, '');
	return first || undefined;
}

function inferShadow(value: string | undefined): Shadow | undefined {
	if (!value) return undefined;
	const m = value.match(/^(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(-?[\d.]+)px\s+(.+?)(?:,|$)/);
	if (!m) return undefined;
	const alpha = m[5].match(/\/\s*([\d.]+)\s*\)/);
	if (alpha && +alpha[1] === 0) return 'none';
	if (+m[3] > 0) return 'soft';
	return +m[1] !== 0 ? 'offset' : 'crisp';
}

/** Read guided inputs back out of a theme, so the controls start where it is. */
export function inferInputs(tokens: ThemeTokens, base: Inputs = defaultInputs): Inputs {
	const out = { ...base };
	const primary = parseColour(tokens.light.primary);
	if (primary) out.brand = oklchToHex(primary);
	const r = tokens.light.radius?.match(/^([\d.]+)rem$/);
	if (r) out.radius = +r[1];
	const bg = parseColour(tokens.light.background);
	if (bg) out.tint = Math.min(1, Math.round((bg[1] / 0.035) * 20) / 20);
	out.shadow = inferShadow(tokens.light['shadow-sm']) ?? out.shadow;
	out.fontSans = firstFamily(tokens.light['font-sans']) ?? out.fontSans;
	out.fontMono = firstFamily(tokens.light['font-mono']) ?? out.fontMono;
	return out;
}

/**
 * Start from whole token sets (a preset, a pasted file, a theme link). Every
 * token it sets stays as an override until a control moves it, and the
 * inputs start from what the theme looks like, unless given.
 */
export function fromTokens(tokens: ThemeTokens, inputs?: Partial<Inputs>): BuilderState {
	return {
		inputs: { ...inferInputs(tokens), ...inputs },
		overrides: { light: { ...tokens.light }, dark: { ...tokens.dark } }
	};
}

// --------------------------------------------------------------- contrast

/** Text tokens and the surface each is read on, for the AA check. */
/** The third entry, where set, is the ratio that pair needs instead of 4.5:1. */
export const TEXT_PAIRS: [text: string, surface: string, min?: number][] = [
	['foreground', 'background'],
	['muted-foreground', 'background'],
	['muted-foreground', 'muted'],
	['card-foreground', 'card'],
	['popover-foreground', 'popover'],
	['primary-foreground', 'primary'],
	['primary', 'background', 3],
	['secondary-foreground', 'secondary'],
	['accent-foreground', 'accent'],
	['destructive-foreground', 'destructive'],
	['sidebar-foreground', 'sidebar'],
	['sidebar-primary-foreground', 'sidebar-primary'],
	['sidebar-accent-foreground', 'sidebar-accent'],
	['code-token-keyword', 'muted'],
	['code-token-string', 'muted'],
	['code-token-function', 'muted'],
	['code-token-constant', 'muted'],
	['code-token-parameter', 'muted'],
	['code-token-comment', 'muted']
];

export interface ContrastIssue {
	mode: Mode;
	text: string;
	surface: string;
	ratio: number;
	/** The ratio this pair needs. */
	min: number;
}

/** Every text token under WCAG AA on its surface, in either colour mode. */
export function contrastIssues(tokens: ThemeTokens): ContrastIssue[] {
	const issues: ContrastIssue[] = [];
	for (const m of ['light', 'dark'] as const) {
		const t = modeTokens(tokens, m);
		for (const [text, surface, min = 4.5] of TEXT_PAIRS) {
			const a = parseColour(t[text]);
			const b = parseColour(t[surface]);
			if (!a || !b) continue;
			const ratio = contrast(a, b);
			if (ratio < min)
				issues.push({ mode: m, text, surface, ratio: Math.round(ratio * 100) / 100, min });
		}
	}
	return issues;
}

// --------------------------------------------------------------- theme files

function tokenBlock(css: string, selector: RegExp): Tokens {
	const m = css.match(selector);
	if (!m) return {};
	const out: Tokens = {};
	for (const [, k, v] of m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[k] = v.trim();
	return out;
}

/**
 * Read a pasted theme file: a tweakcn or shadcn export, a preset, or one of
 * ours. Comments and any `@theme` block are ignored, as the plugin ignores them.
 */
export function parseThemeFile(source: string): ThemeTokens | { error: string } {
	const css = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@theme[^{]*\{[^}]*\}/g, '');
	const light = tokenBlock(css, /:root\s*\{([^}]*)\}/);
	const dark = tokenBlock(css, /\.dark\s*\{([^}]*)\}/);
	if (!Object.keys(light).length && !Object.keys(dark).length) {
		return {
			error:
				"That isn't a theme file: it needs a :root { … } block of --tokens (and usually a .dark one)."
		};
	}
	return { light, dark };
}

/** The theme file: `:root` in full, `.dark` with only what differs from it. */
export function toThemeFile(tokens: ThemeTokens): string {
	const lines = (t: Tokens) =>
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

// ------------------------------------------------------- links and paste codes

function toBase64Url(bytes: Uint8Array) {
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string) {
	const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
	return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
	const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
	return new Uint8Array(await out.arrayBuffer());
}

async function deflate(text: string) {
	return toBase64Url(
		await pipe(new TextEncoder().encode(text), new CompressionStream('deflate-raw'))
	);
}

async function inflate(code: string) {
	return new TextDecoder().decode(
		await pipe(fromBase64Url(code), new DecompressionStream('deflate-raw'))
	);
}

/** The `#theme=` payload: the whole theme, plus the control positions. */
export async function encodeThemeLink(state: BuilderState): Promise<string> {
	return deflate(JSON.stringify({ v: 1, tokens: resolve(state), inputs: state.inputs }));
}

/** Open a `#theme=` payload. Throws on anything that isn't a v1 theme link. */
export async function decodeThemeLink(payload: string): Promise<BuilderState> {
	let data: { v?: number; tokens?: ThemeTokens; inputs?: Partial<Inputs> };
	try {
		data = JSON.parse(await inflate(payload));
	} catch {
		throw new Error("This theme link is damaged: it doesn't decode.");
	}
	if (data.v !== 1) throw new Error(`This theme link is from a newer builder (version ${data.v}).`);
	if (!data.tokens?.light || !data.tokens?.dark)
		throw new Error('This theme link carries no tokens.');
	return fromTokens(data.tokens, data.inputs);
}

/**
 * The code a user pastes into `svelte-docsmith theme` when the browser can't
 * reach the terminal: `dsm1.` and the finished theme file, deflated. It
 * carries the file, not the state, so the CLI needs no generator.
 */
export async function encodePasteCode(file: string): Promise<string> {
	return 'dsm1.' + (await deflate(file));
}
