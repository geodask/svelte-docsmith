/**
 * OKLCH to sRGB, the one conversion both the OG images (which satori can only
 * draw in hex) and the theme builder (contrast checks, the brand colour) need.
 * Björn Ottosson's matrices, kept in one place. No dependencies.
 */

/** OKLCH as [lightness 0–1, chroma, hue in degrees]. */
export type Oklch = [number, number, number];

/** OKLCH to linear-light sRGB, each channel clipped to the gamut (0–1). */
export function oklchToLinearSrgb([L, C, H]: Oklch): [number, number, number] {
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

/** OKLCH to 8-bit sRGB channels. */
export function oklchToSrgb(colour: Oklch): [number, number, number] {
	return oklchToLinearSrgb(colour).map((c) => {
		const encoded = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
		return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
	}) as [number, number, number];
}

/** OKLCH to a six-digit hex colour. */
export function oklchToHex(colour: Oklch): string {
	return `#${oklchToSrgb(colour)
		.map((n) => n.toString(16).padStart(2, '0'))
		.join('')}`;
}
