/**
 * How the header writes a star count: compact for the eye (`1.2k`), exact for
 * the accessible name (`1,234`). Pinned to English so the server and the
 * browser agree on every character, and lowercased because `1.2K` reads as a
 * unit more than a number.
 */
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const exact = new Intl.NumberFormat('en');

export function formatStars(stars: number): { short: string; full: string } {
	return { short: compact.format(stars).toLowerCase(), full: exact.format(stars) };
}
