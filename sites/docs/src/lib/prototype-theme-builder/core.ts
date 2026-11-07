/**
 * PROTOTYPE — throwaway. The pure logic behind the theme builder prototype:
 * a few guided inputs generate a full theme (every token, light and dark),
 * per-token overrides sit on top (from a pasted theme, a preset, or the
 * advanced editor), and the result serialises to a theme file, a theme link
 * and a CLI paste code. No DOM in here; the variants call into it.
 */

export type Tokens = Record<string, string>;
export type ThemeTokens = { light: Tokens; dark: Tokens };

export type Shadow = 'none' | 'soft' | 'crisp' | 'offset';

export interface Inputs {
	/** The brand colour, as the user picked it. */
	brand: string;
	/** How much of the brand hue the neutrals carry, 0 (pure grey) to 1. */
	tint: number;
	/** Corner radius in rem. */
	radius: number;
	shadow: Shadow;
	fontSans: string;
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
	sans: ['Inter', 'Geist', 'IBM Plex Sans', 'Source Sans 3', 'system-ui', 'Source Serif 4'],
	mono: ['JetBrains Mono', 'Geist Mono', 'IBM Plex Mono', 'Fira Code', 'ui-monospace']
};

export function emptyState(inputs: Inputs = defaultInputs): BuilderState {
	return { inputs: { ...inputs }, overrides: { light: {}, dark: {} } };
}

// ---------------------------------------------------------------- colour maths

type Oklch = [number, number, number];

function srgbToLinear(c: number) {
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function hexToOklch(hex: string): Oklch {
	const n = hex.replace('#', '');
	const full = n.length === 3 ? [...n].map((ch) => ch + ch).join('') : n;
	const [r, g, b] = [0, 2, 4].map((i) => srgbToLinear(parseInt(full.slice(i, i + 2), 16) / 255));
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	const C = Math.hypot(A, B);
	const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
	return [L, C, H];
}

function oklchToLinearSrgb([L, C, H]: Oklch) {
	const a = C * Math.cos((H * Math.PI) / 180);
	const b = C * Math.sin((H * Math.PI) / 180);
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
	].map((c) => Math.min(1, Math.max(0, c)));
}

function luminance(c: Oklch) {
	const [r, g, b] = oklchToLinearSrgb(c);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: Oklch, b: Oklch) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

function fmt([L, C, H]: Oklch) {
	const n = (v: number, d: number) => String(Number(v.toFixed(d)));
	return `oklch(${n(L, 3)} ${n(C, 3)} ${n(H, 1)})`;
}

/** Walk lightness away from `bg` until the colour reaches `ratio` on it. */
function readable(c: Oklch, bg: Oklch, ratio = 4.5): Oklch {
	const step = luminance(bg) > 0.18 ? -0.01 : 0.01;
	let [L, C, H] = c;
	while (contrast([L, C, H], bg) < ratio && L > 0.05 && L < 0.98) L += step;
	return [L, C, H];
}

// ------------------------------------------------------------------ generation

const SHADOWS: Record<
	Shadow,
	{ color: string; o: number; blur: number; x: number; y: number; spread: number }
> = {
	none: { color: 'hsl(0 0% 0%', o: 0, blur: 0, x: 0, y: 1, spread: 0 },
	soft: { color: 'hsl(0 0% 0%', o: 0.08, blur: 6, x: 0, y: 2, spread: 0 },
	crisp: { color: 'hsl(0 0% 0%', o: 0.16, blur: 0, x: 0, y: 2, spread: 0 },
	offset: { color: 'hsl(0 0% 0%', o: 1, blur: 0, x: 3, y: 3, spread: 0 }
};

function shadowScale(kind: Shadow): Tokens {
	const s = SHADOWS[kind];
	const px = (v: number) => `${v}px`;
	const c = (a: number) => `${s.color} / ${Math.min(a, 1).toFixed(2)})`;
	const first = (a: number) => `${px(s.x)} ${px(s.y)} ${px(s.blur)} ${px(s.spread)} ${c(a)}`;
	const second = (y: number, b: number) =>
		`${px(s.x)} ${px(y)} ${px(b)} ${px(s.spread - 1)} ${c(s.o)}`;
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
	if (name.startsWith('system-ui') || name.startsWith('ui-')) return name;
	const fallback = kind === 'mono' ? 'monospace' : name.includes('Serif') ? 'serif' : 'sans-serif';
	return `'${name}', ${fallback}`;
}

function mode(inputs: Inputs, dark: boolean): Tokens {
	const [bL, bC, bH] = hexToOklch(inputs.brand);
	const nc = inputs.tint * 0.035; // neutral chroma
	const n = (L: number): Oklch => [L, nc, bH];

	const bg = n(dark ? 0.165 : 0.995);
	const fg = n(dark ? 0.965 : 0.21);
	// Primary: the brand, lifted in dark mode so it stays readable on the surface.
	let primary: Oklch = [dark ? Math.max(bL, 0.72) : bL, bC, bH];
	const white: Oklch = [1, 0, 0];
	const ink = n(dark ? 0.17 : 0.2);
	const onPrimary = contrast(white, primary) >= contrast(ink, primary) ? white : ink;
	if (contrast(onPrimary, primary) < 4.5) primary = readable(primary, onPrimary);

	const muted = n(dark ? 0.25 : 0.965);
	const mutedFg = readable(n(dark ? 0.72 : 0.55), muted);
	const border = n(dark ? 0.28 : 0.92);
	const chart = (dh: number): Oklch => [
		dark ? 0.7 : 0.62,
		Math.max(Math.min(bC, 0.16), 0.08),
		(bH + dh) % 360
	];

	const code = (dh: number) =>
		readable(
			[
				dark ? 0.8 : 0.55,
				nc < 0.004 && bC < 0.03 ? 0 : Math.min(Math.max(bC, 0.09), 0.16),
				(bH + dh) % 360
			],
			bg
		);

	const t: Tokens = {
		background: fmt(bg),
		foreground: fmt(fg),
		card: fmt(n(dark ? 0.2 : 1)),
		'card-foreground': fmt(fg),
		popover: fmt(n(dark ? 0.2 : 1)),
		'popover-foreground': fmt(fg),
		primary: fmt(primary),
		'primary-foreground': fmt(onPrimary),
		secondary: fmt(n(dark ? 0.27 : 0.95)),
		'secondary-foreground': fmt(fg),
		muted: fmt(muted),
		'muted-foreground': fmt(mutedFg),
		accent: fmt(n(dark ? 0.27 : 0.95)),
		'accent-foreground': fmt(fg),
		border: fmt(border),
		input: fmt(border),
		ring: fmt(primary),
		destructive: fmt(dark ? [0.7, 0.19, 22] : [0.58, 0.22, 27]),
		'destructive-foreground': fmt([0.985, 0, 0]),
		'chart-1': fmt(chart(0)),
		'chart-2': fmt(chart(60)),
		'chart-3': fmt(chart(150)),
		'chart-4': fmt(chart(210)),
		'chart-5': fmt(chart(290)),
		sidebar: fmt(n(dark ? 0.19 : 0.975)),
		'sidebar-foreground': fmt(fg),
		'sidebar-primary': fmt(primary),
		'sidebar-primary-foreground': fmt(onPrimary),
		'sidebar-accent': fmt(n(dark ? 0.25 : 0.94)),
		'sidebar-accent-foreground': fmt(fg),
		'sidebar-border': fmt(border),
		'sidebar-ring': fmt(primary),
		'code-token-keyword': fmt(code(0)),
		'code-token-string': fmt(code(140)),
		'code-token-function': fmt(code(250)),
		'code-token-constant': fmt(code(80)),
		'code-token-parameter': fmt(code(310)),
		'code-token-comment': fmt(readable(mutedFg, bg)),
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

export function generate(inputs: Inputs): ThemeTokens {
	return { light: mode(inputs, false), dark: mode(inputs, true) };
}

/** The theme as the page applies it: generated tokens with the overrides on top. */
export function resolve(state: BuilderState): ThemeTokens {
	const g = generate(state.inputs);
	return {
		light: { ...g.light, ...state.overrides.light },
		dark: { ...g.dark, ...state.overrides.dark }
	};
}

/**
 * Change guided inputs. Every token the change moves loses its override, so a
 * control always visibly does something, even over a pasted theme or preset.
 */
export function setInputs(state: BuilderState, patch: Partial<Inputs>): BuilderState {
	const before = generate(state.inputs);
	const inputs = { ...state.inputs, ...patch };
	const after = generate(inputs);
	const prune = (o: Tokens, b: Tokens, a: Tokens) =>
		Object.fromEntries(Object.entries(o).filter(([k]) => b[k] === a[k]));
	return {
		inputs,
		overrides: {
			light: prune(state.overrides.light, before.light, after.light),
			dark: prune(state.overrides.dark, before.dark, after.dark)
		}
	};
}

export function setToken(
	state: BuilderState,
	which: 'light' | 'dark',
	key: string,
	value: string
): BuilderState {
	return {
		...state,
		overrides: { ...state.overrides, [which]: { ...state.overrides[which], [key]: value } }
	};
}

function oklchToHex(c: Oklch) {
	const enc = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
	return (
		'#' +
		oklchToLinearSrgb(c)
			.map((v) =>
				Math.round(Math.min(1, Math.max(0, enc(v))) * 255)
					.toString(16)
					.padStart(2, '0')
			)
			.join('')
	);
}

/** Read guided inputs back out of a theme, so the controls start where it is. */
export function inferInputs(tokens: ThemeTokens, base: Inputs = defaultInputs): Inputs {
	const out = { ...base };
	const p = tokens.light.primary?.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
	if (p) out.brand = oklchToHex([+p[1], +p[2], +p[3]]);
	else if (/^#[\da-f]{6}$/i.test(tokens.light.primary ?? '')) out.brand = tokens.light.primary;
	const r = tokens.light.radius?.match(/^([\d.]+)rem$/);
	if (r) out.radius = +r[1];
	const bg = tokens.light.background?.match(/oklch\(\s*[\d.]+\s+([\d.]+)/);
	if (bg) out.tint = Math.min(1, Math.round((+bg[1] / 0.035) * 20) / 20);
	return out;
}

/**
 * Start from whole token sets (a preset or a pasted file). The guided inputs
 * are read back from it, and every token it sets stays as an override until a
 * control moves it.
 */
export function fromTokens(tokens: ThemeTokens, base: Inputs = defaultInputs): BuilderState {
	return {
		inputs: inferInputs(tokens, base),
		overrides: { light: { ...tokens.light }, dark: { ...tokens.dark } }
	};
}

// --------------------------------------------------------------- theme files

function block(css: string, selector: RegExp): Tokens {
	const m = css.match(selector);
	if (!m) return {};
	const out: Tokens = {};
	for (const [, k, v] of m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[k] = v.trim();
	return out;
}

/**
 * Read a pasted theme file (a tweakcn or shadcn export, or one of ours). Its
 * `@theme inline` block is ignored, as the plugin ignores it.
 */
export function parseThemeFile(source: string): ThemeTokens | { error: string } {
	const css = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@theme[^{]*\{[^}]*\}/g, '');
	const light = block(css, /:root\s*\{([^}]*)\}/);
	const dark = block(css, /\.dark\s*\{([^}]*)\}/);
	if (!Object.keys(light).length && !Object.keys(dark).length) {
		return { error: 'No :root or .dark block with tokens in it.' };
	}
	return { light, dark };
}

/** The theme file: `:root` in full, `.dark` with only what differs. */
export function toThemeFile(
	tokens: ThemeTokens,
	header = 'Made with the svelte-docsmith theme builder.'
): string {
	const lines = (t: Tokens) =>
		Object.entries(t)
			.map(([k, v]) => `\t--${k}: ${v};`)
			.join('\n');
	const darkOnly = Object.fromEntries(
		Object.entries(tokens.dark).filter(([k, v]) => tokens.light[k] !== v)
	);
	return `/* ${header} */\n:root {\n${lines(tokens.light)}\n}\n\n.dark {\n${lines(darkOnly)}\n}\n`;
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

/** Compact, versioned encoding of the builder state, for `#theme=` links. */
export async function encodeState(state: BuilderState): Promise<string> {
	const json = JSON.stringify({ v: 1, i: state.inputs, o: state.overrides });
	return toBase64Url(
		await pipe(new TextEncoder().encode(json), new CompressionStream('deflate-raw'))
	);
}

export async function decodeState(code: string): Promise<BuilderState> {
	const json = new TextDecoder().decode(
		await pipe(fromBase64Url(code), new DecompressionStream('deflate-raw'))
	);
	const { i, o } = JSON.parse(json);
	return {
		inputs: { ...defaultInputs, ...i },
		overrides: { light: o?.light ?? {}, dark: o?.dark ?? {} }
	};
}

/**
 * The code a user pastes into `npx svelte-docsmith theme` when the browser
 * can't reach the terminal: the finished theme file, deflated. It carries the
 * file rather than the state, so the CLI needs no copy of the generator.
 */
export async function encodePasteCode(file: string): Promise<string> {
	return (
		'dsm1.' +
		toBase64Url(await pipe(new TextEncoder().encode(file), new CompressionStream('deflate-raw')))
	);
}
